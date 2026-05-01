"""
3-stage ML training pipeline for the Restock Priority ML system.

Architecture
------------
  Stage 1A : XGBoost Regressor  (Optuna-tuned)
  Stage 1B : LightGBM Regressor (Optuna-tuned)
  Stage 2  : MLP Neural Network (PyTorch, 2 hidden layers)
  Stage 3  : Meta-Learner       (Ridge Regression blender)

Input  : 32-feature matrix X (8 primary variables + 24 external factors)
Target : y = Priority Score in [0.00, 1.00]
Split  : Time-ordered — Train 70 %, Validation 15 %, Test 15 %
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import optuna
import pandas as pd
import torch
import torch.nn as nn
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

# ── Project config import ──
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import RANDOM_SEED, OPTUNA_TRIALS, MODELS_DIR  # noqa: E402

optuna.logging.set_verbosity(optuna.logging.WARNING)

logger = logging.getLogger(__name__)

# ── Reproducibility ──
np.random.seed(RANDOM_SEED)
torch.manual_seed(RANDOM_SEED)


# ---------------------------------------------------------------------------
# MLP definition
# ---------------------------------------------------------------------------
class RestockMLP(nn.Module):
    """Two-hidden-layer MLP for priority-score regression.

    Architecture
    ------------
    Input(32) -> Linear(128) -> ReLU -> Dropout(0.3)
              -> Linear(64)  -> ReLU -> Dropout(0.2)
              -> Linear(1)   -> Sigmoid
    """

    def __init__(self, input_dim: int = 32) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x).squeeze(-1)


# ---------------------------------------------------------------------------
# Trainer
# ---------------------------------------------------------------------------
class RestockMLTrainer:
    """Orchestrates the full 3-stage training pipeline.

    Parameters
    ----------
    random_seed : int
        Seed for all stochastic components (default from config).
    optuna_trials : int
        Number of Optuna optimisation trials (default from config).
    device : str | None
        PyTorch device string.  Auto-detected when *None*.
    """

    def __init__(
        self,
        random_seed: int = RANDOM_SEED,
        optuna_trials: int = OPTUNA_TRIALS,
        device: Optional[str] = None,
    ) -> None:
        self.random_seed = random_seed
        self.optuna_trials = optuna_trials
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )

        self.xgb_model: Optional[XGBRegressor] = None
        self.lgbm_model: Optional[LGBMRegressor] = None
        self.mlp_model: Optional[RestockMLP] = None
        self.meta_learner: Optional[Ridge] = None

    # ------------------------------------------------------------------ #
    # Stage 1A – XGBoost
    # ------------------------------------------------------------------ #
    def train_xgboost(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> XGBRegressor:
        """Train an XGBoost regressor with Optuna hyper-parameter tuning.

        Search space
        ------------
        n_estimators  : [100, 1000]
        max_depth     : [3, 8]
        learning_rate : [0.01, 0.3]
        subsample     : [0.6, 1.0]

        Returns
        -------
        XGBRegressor
            Best model retrained on *X_train* with early stopping on *X_val*.
        """

        def _objective(trial: optuna.Trial) -> float:
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
                "max_depth": trial.suggest_int("max_depth", 3, 8),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "random_state": self.random_seed,
                "verbosity": 0,
                "n_jobs": -1,
            }
            model = XGBRegressor(**params)
            model.fit(
                X_train,
                y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            preds = model.predict(X_val)
            return mean_squared_error(y_val, preds)

        study = optuna.create_study(
            direction="minimize",
            sampler=optuna.samplers.TPESampler(seed=self.random_seed),
        )
        study.optimize(_objective, n_trials=self.optuna_trials)

        best = study.best_params
        best.update({"random_state": self.random_seed, "verbosity": 0, "n_jobs": -1})
        self.xgb_model = XGBRegressor(**best)
        self.xgb_model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
        logger.info("XGBoost best params: %s", study.best_params)
        return self.xgb_model

    # ------------------------------------------------------------------ #
    # Stage 1B – LightGBM
    # ------------------------------------------------------------------ #
    def train_lightgbm(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> LGBMRegressor:
        """Train a LightGBM regressor with Optuna hyper-parameter tuning.

        Search space
        ------------
        num_leaves       : [20, 200]
        min_data_in_leaf : [10, 100]
        feature_fraction : [0.6, 1.0]
        learning_rate    : [0.01, 0.3]

        Returns
        -------
        LGBMRegressor
            Best model retrained on *X_train* with early stopping on *X_val*.
        """

        # Wrap in DataFrames so feature names stay consistent across fit/predict
        feat_names = [f"f{i}" for i in range(X_train.shape[1])]
        X_train_df = pd.DataFrame(X_train, columns=feat_names)
        X_val_df = pd.DataFrame(X_val, columns=feat_names)

        def _objective(trial: optuna.Trial) -> float:
            params = {
                "num_leaves": trial.suggest_int("num_leaves", 20, 200),
                "min_data_in_leaf": trial.suggest_int("min_data_in_leaf", 10, 100),
                "feature_fraction": trial.suggest_float("feature_fraction", 0.6, 1.0),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
                "random_state": self.random_seed,
                "verbosity": -1,
                "n_jobs": -1,
            }
            model = LGBMRegressor(**params)
            model.fit(
                X_train_df,
                y_train,
                eval_set=[(X_val_df, y_val)],
                callbacks=[],
            )
            preds = model.predict(X_val_df)
            return mean_squared_error(y_val, preds)

        study = optuna.create_study(
            direction="minimize",
            sampler=optuna.samplers.TPESampler(seed=self.random_seed),
        )
        study.optimize(_objective, n_trials=self.optuna_trials)

        best = study.best_params
        best.update({"random_state": self.random_seed, "verbosity": -1, "n_jobs": -1})
        self.lgbm_model = LGBMRegressor(**best)
        self.lgbm_model.fit(
            X_train_df,
            y_train,
            eval_set=[(X_val_df, y_val)],
            callbacks=[],
        )
        logger.info("LightGBM best params: %s", study.best_params)
        return self.lgbm_model

    # ------------------------------------------------------------------ #
    # Stage 2 – MLP (PyTorch)
    # ------------------------------------------------------------------ #
    def train_mlp(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        max_epochs: int = 200,
        patience: int = 10,
        lr: float = 0.001,
        batch_size: int = 256,
    ) -> RestockMLP:
        """Train a 2-hidden-layer MLP with early stopping.

        Parameters
        ----------
        max_epochs : int
            Maximum training epochs (default 200).
        patience : int
            Early-stopping patience on validation MSE (default 10).
        lr : float
            Adam learning rate (default 0.001).
        batch_size : int
            Mini-batch size (default 256).

        Returns
        -------
        RestockMLP
            Trained PyTorch model (weights from best validation epoch).
        """
        input_dim = X_train.shape[1]
        model = RestockMLP(input_dim=input_dim).to(self.device)
        optimiser = torch.optim.Adam(model.parameters(), lr=lr)
        criterion = nn.MSELoss()

        X_train_t = torch.tensor(X_train, dtype=torch.float32, device=self.device)
        y_train_t = torch.tensor(y_train, dtype=torch.float32, device=self.device)
        X_val_t = torch.tensor(X_val, dtype=torch.float32, device=self.device)
        y_val_t = torch.tensor(y_val, dtype=torch.float32, device=self.device)

        train_ds = torch.utils.data.TensorDataset(X_train_t, y_train_t)
        train_loader = torch.utils.data.DataLoader(
            train_ds, batch_size=batch_size, shuffle=True
        )

        best_val_loss = float("inf")
        best_state: Dict[str, Any] = {}
        epochs_no_improve = 0

        for epoch in range(1, max_epochs + 1):
            # — training —
            model.train()
            for xb, yb in train_loader:
                optimiser.zero_grad()
                loss = criterion(model(xb), yb)
                loss.backward()
                optimiser.step()

            # — validation —
            model.eval()
            with torch.no_grad():
                val_preds = model(X_val_t)
                val_loss = criterion(val_preds, y_val_t).item()

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
                epochs_no_improve = 0
            else:
                epochs_no_improve += 1

            if epochs_no_improve >= patience:
                logger.info("MLP early stop at epoch %d (best val MSE=%.6f)", epoch, best_val_loss)
                break

        model.load_state_dict(best_state)
        model.eval()
        self.mlp_model = model
        logger.info("MLP training complete — best val MSE=%.6f", best_val_loss)
        return self.mlp_model

    # ------------------------------------------------------------------ #
    # OOF predictions (for meta-learner)
    # ------------------------------------------------------------------ #
    def generate_oof_predictions(
        self,
        models: Dict[str, Any],
        X_train: np.ndarray,
        y_train: np.ndarray,
        n_folds: int = 5,
    ) -> np.ndarray:
        """Generate out-of-fold predictions using ``TimeSeriesSplit``.

        Parameters
        ----------
        models : dict
            ``{"xgb": XGBRegressor, "lgbm": LGBMRegressor, "mlp": RestockMLP}``
        X_train, y_train : array-like
            Full training data.
        n_folds : int
            Number of time-series folds (default 5).

        Returns
        -------
        np.ndarray
            Shape ``(len(X_train), 3)`` — one column per base model.
        """
        tscv = TimeSeriesSplit(n_splits=n_folds)
        oof = np.zeros((len(X_train), len(models)))

        for fold_idx, (train_idx, val_idx) in enumerate(tscv.split(X_train)):
            X_tr, y_tr = X_train[train_idx], y_train[train_idx]
            X_va, y_va = X_train[val_idx], y_train[val_idx]

            for col, (name, model) in enumerate(models.items()):
                if name == "mlp":
                    clone = RestockMLP(input_dim=X_train.shape[1]).to(self.device)
                    clone.load_state_dict(model.state_dict())
                    # Quick fine-tune on this fold
                    clone = self._fit_mlp_fold(clone, X_tr, y_tr, X_va, y_va)
                    clone.eval()
                    with torch.no_grad():
                        t = torch.tensor(X_va, dtype=torch.float32, device=self.device)
                        oof[val_idx, col] = clone(t).cpu().numpy()
                else:
                    import copy
                    fold_model = copy.deepcopy(model)
                    if name == "lgbm":
                        feat_names = [f"f{i}" for i in range(X_tr.shape[1])]
                        fold_model.fit(pd.DataFrame(X_tr, columns=feat_names), y_tr)
                        oof[val_idx, col] = fold_model.predict(pd.DataFrame(X_va, columns=feat_names))
                    else:
                        fold_model.fit(X_tr, y_tr)
                        oof[val_idx, col] = fold_model.predict(X_va)

            logger.info("OOF fold %d/%d complete", fold_idx + 1, n_folds)

        return oof

    # ------------------------------------------------------------------ #
    # Stage 3 – Meta-Learner
    # ------------------------------------------------------------------ #
    def _train_meta_learner(
        self,
        oof_preds: np.ndarray,
        y_train: np.ndarray,
    ) -> Ridge:
        """Fit a Ridge regression blender on OOF predictions.

        Returns
        -------
        Ridge
            Fitted meta-learner.
        """
        self.meta_learner = Ridge(alpha=1.0, random_state=self.random_seed)
        self.meta_learner.fit(oof_preds, y_train)
        logger.info("Meta-learner coefficients: %s", self.meta_learner.coef_)
        return self.meta_learner

    # ------------------------------------------------------------------ #
    # Full pipeline
    # ------------------------------------------------------------------ #
    def train_pipeline(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
        save_dir: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """Execute the complete 3-stage training pipeline.

        Stages
        ------
        1. Train XGBoost & LightGBM (Optuna-tuned).
        2. Train MLP neural network with early stopping.
        3. Generate OOF predictions → train Ridge meta-learner.

        Parameters
        ----------
        X_train, y_train : array-like
            Training split (70 %).
        X_val, y_val : array-like
            Validation split (15 %).
        X_test, y_test : array-like
            Test split (15 %).
        save_dir : Path | None
            Directory to persist artefacts (defaults to ``MODELS_DIR``).

        Returns
        -------
        dict
            ``{"models": {...}, "meta_learner": Ridge, "metrics": {...}}``
        """
        logger.info("═══ Stage 1A: Training XGBoost ═══")
        xgb = self.train_xgboost(X_train, y_train, X_val, y_val)

        logger.info("═══ Stage 1B: Training LightGBM ═══")
        lgbm = self.train_lightgbm(X_train, y_train, X_val, y_val)

        logger.info("═══ Stage 2: Training MLP ═══")
        mlp = self.train_mlp(X_train, y_train, X_val, y_val)

        base_models: Dict[str, Any] = {"xgb": xgb, "lgbm": lgbm, "mlp": mlp}

        logger.info("═══ Stage 3: Generating OOF & training meta-learner ═══")
        oof_preds = self.generate_oof_predictions(base_models, X_train, y_train)
        meta = self._train_meta_learner(oof_preds, y_train)

        # — Test-set evaluation —
        test_preds = self._predict_stack(base_models, meta, X_test)
        metrics = self._evaluate(y_test, test_preds)
        logger.info("Test metrics: %s", metrics)

        # — Persist —
        target = save_dir or MODELS_DIR
        self.save_models(
            {"xgb": xgb, "lgbm": lgbm, "mlp": mlp, "meta_learner": meta},
            target,
        )

        return {"models": base_models, "meta_learner": meta, "metrics": metrics}

    # ------------------------------------------------------------------ #
    # Prediction helpers
    # ------------------------------------------------------------------ #
    def _predict_stack(
        self,
        base_models: Dict[str, Any],
        meta: Ridge,
        X: np.ndarray,
    ) -> np.ndarray:
        """Generate blended predictions from the stacked ensemble."""
        feat_names = [f"f{i}" for i in range(X.shape[1])]
        stage1 = np.column_stack(
            [
                base_models["xgb"].predict(X),
                base_models["lgbm"].predict(pd.DataFrame(X, columns=feat_names)),
                self._predict_mlp(base_models["mlp"], X),
            ]
        )
        return np.clip(meta.predict(stage1), 0.0, 1.0)

    def _predict_mlp(self, model: RestockMLP, X: np.ndarray) -> np.ndarray:
        """Run MLP inference on a numpy array."""
        model.eval()
        with torch.no_grad():
            t = torch.tensor(X, dtype=torch.float32, device=self.device)
            return model(t).cpu().numpy()

    # ------------------------------------------------------------------ #
    # Evaluation
    # ------------------------------------------------------------------ #
    @staticmethod
    def _evaluate(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Compute regression metrics."""
        return {
            "MAE": float(mean_absolute_error(y_true, y_pred)),
            "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
            "R2": float(r2_score(y_true, y_pred)),
        }

    # ------------------------------------------------------------------ #
    # Internal MLP fold helper
    # ------------------------------------------------------------------ #
    def _fit_mlp_fold(
        self,
        model: RestockMLP,
        X_tr: np.ndarray,
        y_tr: np.ndarray,
        X_va: np.ndarray,
        y_va: np.ndarray,
        max_epochs: int = 50,
        patience: int = 5,
        lr: float = 0.001,
        batch_size: int = 256,
    ) -> RestockMLP:
        """Quickly fine-tune an MLP clone on a single OOF fold."""
        optimiser = torch.optim.Adam(model.parameters(), lr=lr)
        criterion = nn.MSELoss()

        X_tr_t = torch.tensor(X_tr, dtype=torch.float32, device=self.device)
        y_tr_t = torch.tensor(y_tr, dtype=torch.float32, device=self.device)
        X_va_t = torch.tensor(X_va, dtype=torch.float32, device=self.device)
        y_va_t = torch.tensor(y_va, dtype=torch.float32, device=self.device)

        ds = torch.utils.data.TensorDataset(X_tr_t, y_tr_t)
        loader = torch.utils.data.DataLoader(ds, batch_size=batch_size, shuffle=True)

        best_loss = float("inf")
        best_state: Dict[str, Any] = {}
        no_improve = 0

        for _ in range(max_epochs):
            model.train()
            for xb, yb in loader:
                optimiser.zero_grad()
                criterion(model(xb), yb).backward()
                optimiser.step()

            model.eval()
            with torch.no_grad():
                val_loss = criterion(model(X_va_t), y_va_t).item()

            if val_loss < best_loss:
                best_loss = val_loss
                best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
                no_improve = 0
            else:
                no_improve += 1

            if no_improve >= patience:
                break

        model.load_state_dict(best_state)
        return model

    # ------------------------------------------------------------------ #
    # Persistence
    # ------------------------------------------------------------------ #
    def save_models(self, models_dict: Dict[str, Any], save_dir: Path) -> None:
        """Save all models to *save_dir*.

        * XGBoost / LightGBM / Meta-learner → ``joblib``
        * MLP → ``torch.save``
        """
        save_dir = Path(save_dir)
        save_dir.mkdir(parents=True, exist_ok=True)

        for name, model in models_dict.items():
            if name == "mlp":
                torch.save(model.state_dict(), save_dir / "mlp.pt")
            else:
                joblib.dump(model, save_dir / f"{name}.joblib")

        logger.info("Models saved to %s", save_dir)

    def load_models(self, save_dir: Path, input_dim: int = 32) -> Dict[str, Any]:
        """Load a previously saved model set.

        Parameters
        ----------
        save_dir : Path
            Directory containing the saved artefacts.
        input_dim : int
            Feature dimensionality for the MLP (default 32).

        Returns
        -------
        dict
            ``{"xgb": ..., "lgbm": ..., "mlp": ..., "meta_learner": ...}``
        """
        save_dir = Path(save_dir)

        xgb: XGBRegressor = joblib.load(save_dir / "xgb.joblib")
        lgbm: LGBMRegressor = joblib.load(save_dir / "lgbm.joblib")

        mlp = RestockMLP(input_dim=input_dim).to(self.device)
        mlp.load_state_dict(torch.load(save_dir / "mlp.pt", map_location=self.device))
        mlp.eval()

        meta: Ridge = joblib.load(save_dir / "meta_learner.joblib")

        self.xgb_model = xgb
        self.lgbm_model = lgbm
        self.mlp_model = mlp
        self.meta_learner = meta

        logger.info("Models loaded from %s", save_dir)
        return {"xgb": xgb, "lgbm": lgbm, "mlp": mlp, "meta": meta}
