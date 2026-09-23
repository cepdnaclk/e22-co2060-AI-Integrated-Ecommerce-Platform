"""
Meta-Learner and Ensemble for the Restock Priority ML system.

Combines predictions from XGBoost, LightGBM, and an MLP neural network
via a meta-learner (e.g. Ridge) to produce a final priority score.
Provides uncertainty estimation and comparison with the deterministic
scoring formula.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd
import torch
from pandas import DataFrame

# ── Project config import ──
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import PRIORITY_TIERS  # noqa: E402

try:
    from src.train import RestockMLP  # noqa: E402
except ImportError:
    from train import RestockMLP  # noqa: E402


def _get_priority_tier(score: float) -> str:
    """Return the tier label for a given priority score."""
    for tier_name, info in PRIORITY_TIERS.items():
        if info["min"] <= score <= info["max"]:
            return tier_name
    return "LOW"


class EnsemblePredictor:
    """Ensemble predictor that blends XGBoost, LightGBM, and MLP outputs
    through a meta-learner to produce final restock priority scores."""

    # ------------------------------------------------------------------ #
    # 1. Core ensemble prediction
    # ------------------------------------------------------------------ #

    @staticmethod
    def predict(
        X: np.ndarray,
        xgb_model: Any,
        lgbm_model: Any,
        mlp_model: RestockMLP,
        meta_model: Any,
    ) -> np.ndarray:
        """Generate final predictions by stacking base-learner outputs.

        Parameters
        ----------
        X : np.ndarray
            Feature matrix of shape ``(n_samples, n_features)``.
        xgb_model : XGBRegressor
            Trained XGBoost model.
        lgbm_model : LGBMRegressor
            Trained LightGBM model.
        mlp_model : RestockMLP
            Trained PyTorch MLP model.
        meta_model : Ridge (or compatible)
            Trained meta-learner that blends the three base predictions.

        Returns
        -------
        np.ndarray
            Final predictions clipped to [0.0, 1.0].
        """
        X = np.asarray(X, dtype=np.float32)
        if X.ndim == 1:
            X = X.reshape(1, -1)

        # Base-learner predictions
        p1 = xgb_model.predict(X)
        # Pass DataFrame with feature names to avoid sklearn UserWarning
        feat_names = [f"f{i}" for i in range(X.shape[1])]
        p2 = lgbm_model.predict(pd.DataFrame(X, columns=feat_names))

        # MLP forward pass
        mlp_model.eval()
        with torch.no_grad():
            X_tensor = torch.tensor(X, dtype=torch.float32)
            p3 = mlp_model(X_tensor).cpu().numpy()

        P_stack = np.column_stack([p1, p2, p3])
        y_final = meta_model.predict(P_stack)

        return np.clip(y_final, 0.0, 1.0)

    # ------------------------------------------------------------------ #
    # 2. Uncertainty estimation via bootstrap
    # ------------------------------------------------------------------ #

    def predict_with_uncertainty(
        self,
        X: np.ndarray,
        models_dict: Dict[str, Any],
        n_bootstrap: int = 100,
    ) -> Dict[str, Any]:
        """Bootstrap sampling for uncertainty estimation.

        Parameters
        ----------
        X : np.ndarray
            Feature matrix of shape ``(n_samples, n_features)``.
        models_dict : dict
            Must contain keys ``"xgb"``, ``"lgbm"``, ``"mlp"``, ``"meta"``.
        n_bootstrap : int
            Number of bootstrap iterations (default 100).

        Returns
        -------
        dict
            ``mean_score``              – mean prediction across bootstraps
            ``std_score``               – standard deviation across bootstraps
            ``confidence_interval_95``  – (lower, upper) 95 % CI
            ``is_uncertain``            – True when std > 0.10
        """
        X = np.asarray(X, dtype=np.float32)
        if X.ndim == 1:
            X = X.reshape(1, -1)

        n_samples = X.shape[0]
        bootstrap_preds: List[np.ndarray] = []

        for _ in range(n_bootstrap):
            indices = np.random.choice(n_samples, size=n_samples, replace=True)
            X_boot = X[indices]
            preds = self.predict(
                X_boot,
                models_dict["xgb"],
                models_dict["lgbm"],
                models_dict["mlp"],
                models_dict["meta"],
            )
            bootstrap_preds.append(preds)

        all_preds = np.array(bootstrap_preds)  # (n_bootstrap, n_samples)
        mean_score = np.mean(all_preds, axis=0)
        std_score = np.std(all_preds, axis=0)
        lower = np.percentile(all_preds, 2.5, axis=0)
        upper = np.percentile(all_preds, 97.5, axis=0)

        return {
            "mean_score": mean_score,
            "std_score": std_score,
            "confidence_interval_95": (lower, upper),
            "is_uncertain": bool(np.any(std_score > 0.10)),
        }

    # ------------------------------------------------------------------ #
    # 3. Single-SKU prediction
    # ------------------------------------------------------------------ #

    def predict_single(
        self,
        sku_features: Union[Dict[str, float], np.ndarray],
        models: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Predict the restock priority for a single SKU.

        Parameters
        ----------
        sku_features : dict or np.ndarray
            Feature values for one SKU.  If a dict, values are extracted
            and ordered as a 1-D array.
        models : dict
            Must contain ``"xgb"``, ``"lgbm"``, ``"mlp"``, ``"meta"``.

        Returns
        -------
        dict
            ``sku_id``, ``final_score``, ``xgb_score``, ``lgbm_score``,
            ``mlp_score``, ``uncertainty_std``, ``priority_tier``,
            ``timestamp``.
        """
        if isinstance(sku_features, dict):
            sku_id = sku_features.pop("SKU_ID", sku_features.pop("sku_id", "UNKNOWN"))
            X = np.array(list(sku_features.values()), dtype=np.float32).reshape(1, -1)
        else:
            sku_id = "UNKNOWN"
            X = np.asarray(sku_features, dtype=np.float32).reshape(1, -1)

        # Individual base-learner scores
        xgb_score = float(models["xgb"].predict(X)[0])
        X_lgbm = pd.DataFrame(X, columns=[f"f{i}" for i in range(X.shape[1])])
        lgbm_score = float(models["lgbm"].predict(X_lgbm)[0])

        models["mlp"].eval()
        with torch.no_grad():
            X_tensor = torch.tensor(X, dtype=torch.float32)
            mlp_score = float(models["mlp"](X_tensor).cpu().numpy()[0])

        # Final ensemble score
        final_score = float(
            self.predict(X, models["xgb"], models["lgbm"], models["mlp"], models["meta"])[0]
        )

        # Quick uncertainty from base-learner disagreement
        uncertainty_std = float(np.std([xgb_score, lgbm_score, mlp_score]))

        return {
            "sku_id": sku_id,
            "final_score": final_score,
            "xgb_score": xgb_score,
            "lgbm_score": lgbm_score,
            "mlp_score": mlp_score,
            "uncertainty_std": uncertainty_std,
            "priority_tier": _get_priority_tier(final_score),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------ #
    # 4. Batch-ranked prediction
    # ------------------------------------------------------------------ #

    def predict_batch_ranked(
        self,
        X_df: DataFrame,
        models: Dict[str, Any],
    ) -> DataFrame:
        """Predict all rows, sort by score descending, and add rank/tier.

        Parameters
        ----------
        X_df : DataFrame
            Feature DataFrame. May contain a ``"SKU_ID"`` column (preserved
            but not used as a feature).
        models : dict
            Must contain ``"xgb"``, ``"lgbm"``, ``"mlp"``, ``"meta"``.

        Returns
        -------
        DataFrame
            Original columns plus ``final_score``, ``rank``, and
            ``priority_tier``, sorted by ``final_score`` descending.
        """
        result_df = X_df.copy()

        # Separate metadata from features
        feature_cols = [c for c in X_df.columns if c not in ("SKU_ID", "sku_id")]
        X = X_df[feature_cols].values.astype(np.float32)

        scores = self.predict(
            X, models["xgb"], models["lgbm"], models["mlp"], models["meta"]
        )

        result_df["final_score"] = scores
        result_df = result_df.sort_values("final_score", ascending=False).reset_index(drop=True)
        result_df["rank"] = range(1, len(result_df) + 1)
        result_df["priority_tier"] = result_df["final_score"].apply(_get_priority_tier)

        return result_df

    # ------------------------------------------------------------------ #
    # 5. Comparison with deterministic formula
    # ------------------------------------------------------------------ #

    def compare_with_deterministic(
        self,
        X_df: DataFrame,
        models: Dict[str, Any],
        weight_engine: Any,
        scoring_engine: Any,
    ) -> DataFrame:
        """Compare ML ensemble predictions against the deterministic formula.

        Parameters
        ----------
        X_df : DataFrame
            Feature DataFrame with primary variable and external factor
            columns.  Must include ``"SKU_ID"`` when available.
        models : dict
            Must contain ``"xgb"``, ``"lgbm"``, ``"mlp"``, ``"meta"``.
        weight_engine : WeightEngine
            Instance with a ``compute_weights`` method.
        scoring_engine : PriorityScoreEngine
            Instance with ``compute_score`` and ``get_priority_tier``.

        Returns
        -------
        DataFrame
            Columns: ``SKU_ID``, ``ml_score``, ``ml_tier``,
            ``deterministic_score``, ``deterministic_tier``,
            ``score_diff``, ``tier_match``.
        """
        feature_cols = [c for c in X_df.columns if c not in ("SKU_ID", "sku_id")]
        X = X_df[feature_cols].values.astype(np.float32)

        ml_scores = self.predict(
            X, models["xgb"], models["lgbm"], models["mlp"], models["meta"]
        )

        # Primary variable names for the deterministic formula
        primary_vars = ["D", "S", "L", "P", "SC", "HC", "SR", "SE"]

        records: List[Dict[str, Any]] = []
        for idx in range(len(X_df)):
            row = X_df.iloc[idx]
            sku_id = row.get("SKU_ID", row.get("sku_id", f"SKU_{idx}"))

            # Deterministic scoring
            ext_factors = {c: float(row[c]) for c in feature_cols if c not in primary_vars}
            weights = weight_engine.compute_weights(ext_factors)
            var_norm = {v: float(row[v]) for v in primary_vars if v in row.index}
            det_score = scoring_engine.compute_score(var_norm, weights)
            det_tier = scoring_engine.get_priority_tier(det_score)["tier"]

            ml_score = float(ml_scores[idx])
            ml_tier = _get_priority_tier(ml_score)

            records.append({
                "SKU_ID": sku_id,
                "ml_score": ml_score,
                "ml_tier": ml_tier,
                "deterministic_score": det_score,
                "deterministic_tier": det_tier,
                "score_diff": abs(ml_score - det_score),
                "tier_match": ml_tier == det_tier,
            })

        return pd.DataFrame(records)
