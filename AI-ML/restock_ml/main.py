"""
Orchestration script for the Restock Priority ML system.

Usage:
    python main.py --mode score   [--data-path path/to/skus.csv]
    python main.py --mode train
    python main.py --mode evaluate [--data-path path/to/test.csv]
"""

import argparse
import logging
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import (
    ALL_FEATURES,
    MODELS_DIR,
    SQLITE_DB,
    SYNTHETIC_DIR,
    LOGS_DIR,
    TEST_SIZE,
    VAL_SIZE,
)

from src.normalize import Normalizer
from src.weights import WeightEngine
from src.scoring import PriorityScoreEngine
from src.ensemble import EnsemblePredictor
from src.train import RestockMLTrainer
from src.evaluate import ModelEvaluator

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(str(LOGS_DIR / "main.log"), encoding="utf-8"),
    ],
)
logger = logging.getLogger("restock_ml")


# ─────────────────────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────────────────────

def setup_system() -> dict:
    """Initialize all system components and return them in a dict."""
    normalizer = Normalizer()
    weight_engine = WeightEngine()
    scoring_engine = PriorityScoreEngine()
    ensemble = EnsemblePredictor()
    trainer = RestockMLTrainer()
    evaluator = ModelEvaluator()

    models = None
    if _models_exist():
        logger.info("Loading trained models from %s", MODELS_DIR)
        models = trainer.load_models(MODELS_DIR)

    return {
        "normalizer": normalizer,
        "weight_engine": weight_engine,
        "scoring_engine": scoring_engine,
        "ensemble": ensemble,
        "trainer": trainer,
        "evaluator": evaluator,
        "models": models,
    }


def _models_exist() -> bool:
    """Check whether all required model artefacts are present."""
    required = ["xgb.joblib", "lgbm.joblib", "mlp.pt", "meta_learner.joblib"]
    return all((MODELS_DIR / f).exists() for f in required)


# ─────────────────────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────────────────────

def train_models_if_needed(components: dict) -> dict:
    """Train and save models using synthetic data if no models exist.

    If models are already loaded in *components*, this is a no-op unless
    forced by the CLI ``--mode train`` path which calls this directly.
    """
    trainer: RestockMLTrainer = components["trainer"]

    # Generate synthetic data if not already present
    training_path = SYNTHETIC_DIR / "training_data.csv"
    if not training_path.exists():
        logger.info("Generating synthetic training data …")
        from synthetic_data_generator import generate_and_save
        generate_and_save()

    logger.info("Loading training data from %s", training_path)
    df = pd.read_csv(training_path)

    feature_cols = [c for c in df.columns if c != "priority_score"]
    X = df[feature_cols].values.astype(np.float32)
    y = df["priority_score"].values.astype(np.float32)

    n = len(X)
    test_end = int(n * (1 - TEST_SIZE))
    val_end = int(test_end * (1 - VAL_SIZE / (1 - TEST_SIZE)))

    X_train, y_train = X[:val_end], y[:val_end]
    X_val, y_val = X[val_end:test_end], y[val_end:test_end]
    X_test, y_test = X[test_end:], y[test_end:]

    logger.info(
        "Splits — train: %d, val: %d, test: %d", len(X_train), len(X_val), len(X_test)
    )

    result = trainer.train_pipeline(X_train, y_train, X_val, y_val, X_test, y_test)
    components["models"] = {
        "xgb": result["models"]["xgb"],
        "lgbm": result["models"]["lgbm"],
        "mlp": result["models"]["mlp"],
        "meta": result["meta_learner"],
    }
    logger.info("Training complete. Test metrics: %s", result["metrics"])
    return components


# ─────────────────────────────────────────────────────────────────────────────
# Batch scoring
# ─────────────────────────────────────────────────────────────────────────────

def run_batch_scoring(components: dict, data_path: str | None = None) -> pd.DataFrame:
    """Run daily batch scoring on all SKUs and log results to SQLite.

    Parameters
    ----------
    components : dict
        Output of :func:`setup_system` (must include trained models).
    data_path : str, optional
        Path to a CSV with SKU feature data. Falls back to synthetic data.

    Returns
    -------
    DataFrame
        Scored SKUs with columns: SKU_ID, final_score, rank, priority_tier.
    """
    if components["models"] is None:
        raise RuntimeError("No trained models available. Run with --mode train first.")

    # Load data
    if data_path:
        df = pd.read_csv(data_path)
    else:
        fallback = SYNTHETIC_DIR / "synthetic_sku_data.csv"
        if not fallback.exists():
            raise FileNotFoundError(f"No data found at {fallback}. Provide --data-path.")
        df = pd.read_csv(fallback)

    # Prepare feature matrix (exclude metadata and target)
    meta_cols = {"SKU_ID", "timestamp", "category", "supplier_id", "priority_score"}
    feature_cols = [c for c in df.columns if c not in meta_cols]
    X_features = df[feature_cols].copy()

    # Fit normalizer on feature data and transform
    normalizer: Normalizer = components["normalizer"]
    normalizer.fit(X_features)
    X_norm = normalizer.transform(X_features)

    # Ensemble prediction
    ensemble: EnsemblePredictor = components["ensemble"]
    models = components["models"]
    result_df = X_norm.copy()
    if "SKU_ID" in df.columns:
        result_df.insert(0, "SKU_ID", df["SKU_ID"].values)

    scored_df = ensemble.predict_batch_ranked(result_df, models)

    # Log to SQLite
    _log_to_sqlite(scored_df)

    # Print critical alerts
    _print_critical_alerts(scored_df)

    return scored_df


def _log_to_sqlite(scored_df: pd.DataFrame) -> None:
    """Persist scoring results to SQLite database."""
    conn = sqlite3.connect(SQLITE_DB)
    timestamp = datetime.now(timezone.utc).isoformat()
    scored_df = scored_df.copy()
    scored_df["scored_at"] = timestamp

    scored_df.to_sql("scoring_results", conn, if_exists="append", index=False)
    conn.close()
    logger.info("Logged %d scores to %s", len(scored_df), SQLITE_DB)


def _print_critical_alerts(scored_df: pd.DataFrame) -> None:
    """Print SKUs in the CRITICAL priority tier."""
    critical = scored_df[scored_df["priority_tier"] == "CRITICAL"]
    if critical.empty:
        logger.info("No CRITICAL tier SKUs detected.")
        return

    print(f"\n{'='*60}")
    print(f"  ⚠  CRITICAL RESTOCK ALERTS — {len(critical)} SKU(s)")
    print(f"{'='*60}")
    for _, row in critical.head(20).iterrows():
        sku = row.get("SKU_ID", "N/A")
        score = row.get("final_score", 0.0)
        print(f"  {sku}  score={score:.4f}  → Restock immediately (24h)")
    if len(critical) > 20:
        print(f"  ... and {len(critical) - 20} more")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# Evaluate
# ─────────────────────────────────────────────────────────────────────────────

def run_evaluation(components: dict, data_path: str | None = None) -> None:
    """Evaluate models on test data and generate an HTML report."""
    if components["models"] is None:
        raise RuntimeError("No trained models available. Run with --mode train first.")

    training_path = data_path or str(SYNTHETIC_DIR / "training_data.csv")
    df = pd.read_csv(training_path)

    feature_cols = [c for c in df.columns if c != "priority_score"]
    X = df[feature_cols].values.astype(np.float32)
    y_true = df["priority_score"].values.astype(np.float32)

    # Use last TEST_SIZE portion as test set
    split = int(len(X) * (1 - TEST_SIZE))
    X_test, y_test = X[split:], y_true[split:]

    models = components["models"]
    ensemble: EnsemblePredictor = components["ensemble"]
    y_pred = ensemble.predict(
        X_test, models["xgb"], models["lgbm"], models["mlp"], models["meta"]
    )

    evaluator: ModelEvaluator = components["evaluator"]
    metrics = evaluator.compute_all_metrics(y_test, y_pred)
    tier_eval = evaluator.evaluate_priority_tiers(y_test, y_pred)

    print(f"\n{'='*60}")
    print("  Evaluation Results")
    print(f"{'='*60}")
    for name, info in metrics.items():
        status = "✓" if info["pass"] else "✗"
        print(f"  {status} {name:>18s}: {info['value']:.4f}")

    evaluator.generate_evaluation_report({
        "metrics": metrics,
        "y_true": y_test,
        "y_pred": y_pred,
        "tier_eval": tier_eval,
    })
    logger.info("Evaluation report saved.")


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Restock Priority ML — orchestration CLI"
    )
    parser.add_argument(
        "--mode",
        choices=["score", "train", "evaluate"],
        default="score",
        help="Operation mode (default: score)",
    )
    parser.add_argument(
        "--data-path",
        type=str,
        default=None,
        help="Optional path to input CSV data",
    )
    args = parser.parse_args()

    logger.info("Starting Restock ML system in '%s' mode", args.mode)
    components = setup_system()

    if args.mode == "train":
        train_models_if_needed(components)

    elif args.mode == "score":
        if components["models"] is None:
            logger.info("No models found — training first …")
            train_models_if_needed(components)
        scored = run_batch_scoring(components, args.data_path)
        logger.info("Batch scoring complete — %d SKUs processed", len(scored))

    elif args.mode == "evaluate":
        if components["models"] is None:
            logger.info("No models found — training first …")
            train_models_if_needed(components)
        run_evaluation(components, args.data_path)


if __name__ == "__main__":
    main()
