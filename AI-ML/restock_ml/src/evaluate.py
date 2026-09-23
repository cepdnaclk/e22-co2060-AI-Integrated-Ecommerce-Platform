"""
Model Evaluation for the Restock Priority ML system.

Provides metrics computation, tier-level classification evaluation,
walk-forward time-series validation, model comparison, HTML report
generation, and model-drift detection.

Metrics (with acceptance thresholds from config):
    MAE            < 0.05
    RMSE           < 0.08
    R²             > 0.90
    MAPE           < 7 %
    Precision@Top10 > 0.85
    Recall@Top10   > 0.90
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from pandas import DataFrame
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

# ── Project config import ──
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import EVAL_THRESHOLDS, PRIORITY_TIERS, REPORTS_DIR  # noqa: E402


# ── Helpers ──

def _score_to_tier(score: float) -> str:
    """Map a continuous priority score to its tier label."""
    for tier_name, info in PRIORITY_TIERS.items():
        if info["min"] <= score <= info["max"]:
            return tier_name
    return "LOW"


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Percentage Error (%).

    Values where ``y_true == 0`` are excluded to avoid division by zero.
    """
    mask = y_true != 0
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def _precision_recall_at_top_k(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    percentile: float = 90,
) -> Tuple[float, float]:
    """Precision and Recall for items predicted in the top *percentile*.

    "Critical" ground-truth items are those whose true score ≥ the
    *percentile* of ``y_true``.  Predicted critical items are those whose
    predicted score ≥ the same percentile of ``y_pred``.

    Returns
    -------
    (precision, recall)
    """
    true_threshold = float(np.percentile(y_true, percentile))
    pred_threshold = float(np.percentile(y_pred, percentile))

    actual_critical = y_true >= true_threshold
    predicted_critical = y_pred >= pred_threshold

    tp = int(np.sum(actual_critical & predicted_critical))
    fp = int(np.sum(~actual_critical & predicted_critical))
    fn = int(np.sum(actual_critical & ~predicted_critical))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    return precision, recall


# ── Main evaluator ──

class ModelEvaluator:
    """Comprehensive evaluator for the Restock Priority ML models."""

    def __init__(self, thresholds: Optional[Dict[str, float]] = None) -> None:
        self.thresholds = thresholds or EVAL_THRESHOLDS

    # ------------------------------------------------------------------ #
    # 1. Compute all metrics
    # ------------------------------------------------------------------ #

    def compute_all_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
    ) -> Dict[str, Any]:
        """Compute all six evaluation metrics with pass/fail status.

        Parameters
        ----------
        y_true : array-like
            Ground-truth priority scores in [0, 1].
        y_pred : array-like
            Predicted priority scores in [0, 1].

        Returns
        -------
        dict
            Keys are metric names; each value is a dict with ``"value"``
            and ``"pass"`` (bool).
        """
        y_true = np.asarray(y_true, dtype=np.float64)
        y_pred = np.asarray(y_pred, dtype=np.float64)

        mae = float(mean_absolute_error(y_true, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        r2 = float(r2_score(y_true, y_pred))
        mape_val = _mape(y_true, y_pred)
        prec, rec = _precision_recall_at_top_k(y_true, y_pred, percentile=90)

        results: Dict[str, Any] = {
            "MAE": {"value": mae, "pass": mae < self.thresholds["MAE"]},
            "RMSE": {"value": rmse, "pass": rmse < self.thresholds["RMSE"]},
            "R2": {"value": r2, "pass": r2 > self.thresholds["R2"]},
            "MAPE": {"value": mape_val, "pass": mape_val < self.thresholds["MAPE"]},
            "Precision@Top10": {
                "value": prec,
                "pass": prec > self.thresholds["Precision@Top10"],
            },
            "Recall@Top10": {
                "value": rec,
                "pass": rec > self.thresholds["Recall@Top10"],
            },
        }
        return results

    # ------------------------------------------------------------------ #
    # 2. Tier-level classification evaluation
    # ------------------------------------------------------------------ #

    def evaluate_priority_tiers(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
    ) -> Dict[str, Any]:
        """Convert continuous scores to tiers and evaluate classification.

        Parameters
        ----------
        y_true, y_pred : array-like
            Continuous priority scores in [0, 1].

        Returns
        -------
        dict
            ``"accuracy"`` – overall tier accuracy,
            ``"confusion_matrix"`` – 2-D list,
            ``"classification_report"`` – sklearn text report,
            ``"tier_labels"`` – ordered label list.
        """
        y_true = np.asarray(y_true, dtype=np.float64)
        y_pred = np.asarray(y_pred, dtype=np.float64)

        true_tiers = [_score_to_tier(s) for s in y_true]
        pred_tiers = [_score_to_tier(s) for s in y_pred]

        tier_labels = list(PRIORITY_TIERS.keys())
        cm = confusion_matrix(true_tiers, pred_tiers, labels=tier_labels)
        accuracy = float(np.sum(np.array(true_tiers) == np.array(pred_tiers)) / len(true_tiers))
        report = classification_report(
            true_tiers, pred_tiers, labels=tier_labels, zero_division=0,
        )

        return {
            "accuracy": accuracy,
            "confusion_matrix": cm.tolist(),
            "classification_report": report,
            "tier_labels": tier_labels,
        }

    # ------------------------------------------------------------------ #
    # 3. Walk-forward time-series cross-validation
    # ------------------------------------------------------------------ #

    def walk_forward_validation(
        self,
        X_df: DataFrame,
        y_series: pd.Series,
        models: List[Any],
        n_splits: int = 5,
    ) -> Dict[str, Any]:
        """Walk-forward (expanding-window) cross-validation.

        The data is assumed to be sorted chronologically.  For each fold
        *k*, the training set is rows ``[0 .. split_k)`` and the test set
        is ``[split_k .. split_{k+1})``.

        Parameters
        ----------
        X_df : DataFrame
            Feature DataFrame (chronologically ordered).
        y_series : Series
            Target values aligned with *X_df*.
        models : list
            Pre-initialised scikit-learn-compatible estimators (must
            support ``.fit()`` / ``.predict()``).  Each model is
            independently evaluated.
        n_splits : int
            Number of forward-walk splits (default 5).

        Returns
        -------
        dict
            Per-model dict with ``"mean"`` and ``"std"`` of each metric.
        """
        n = len(X_df)
        fold_size = n // (n_splits + 1)

        results: Dict[str, Dict[str, Any]] = {}

        for model in models:
            model_name = type(model).__name__
            fold_metrics: List[Dict[str, Any]] = []

            for k in range(1, n_splits + 1):
                train_end = fold_size * k
                test_end = min(train_end + fold_size, n)
                if train_end >= n or test_end <= train_end:
                    continue

                X_train = X_df.iloc[:train_end].values
                y_train = y_series.iloc[:train_end].values
                X_test = X_df.iloc[train_end:test_end].values
                y_test = y_series.iloc[train_end:test_end].values

                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)

                metrics = self.compute_all_metrics(y_test, y_pred)
                fold_metrics.append({k: v["value"] for k, v in metrics.items()})

            if not fold_metrics:
                results[model_name] = {"mean": {}, "std": {}}
                continue

            metric_names = list(fold_metrics[0].keys())
            mean_dict = {
                m: float(np.mean([fm[m] for fm in fold_metrics])) for m in metric_names
            }
            std_dict = {
                m: float(np.std([fm[m] for fm in fold_metrics])) for m in metric_names
            }
            results[model_name] = {"mean": mean_dict, "std": std_dict}

        return results

    # ------------------------------------------------------------------ #
    # 4. Model comparison
    # ------------------------------------------------------------------ #

    def compare_models(
        self,
        base_scores_dict: Dict[str, Dict[str, Any]],
        ensemble_scores: Dict[str, Any],
    ) -> DataFrame:
        """Compare base-learners and ensemble across all metrics.

        Parameters
        ----------
        base_scores_dict : dict
            ``{"XGB": metrics_dict, "LGBM": metrics_dict, "MLP": metrics_dict}``
            where each *metrics_dict* is the output of
            :meth:`compute_all_metrics`.
        ensemble_scores : dict
            Metrics dict for the ensemble (same format).

        Returns
        -------
        DataFrame
            Rows = metric names, columns = model names + ``"Threshold"``
            and ``"Best"`` indicator.
        """
        all_models = {**base_scores_dict, "Ensemble": ensemble_scores}
        metric_names = list(ensemble_scores.keys())

        rows: List[Dict[str, Any]] = []
        for metric in metric_names:
            row: Dict[str, Any] = {"Metric": metric}
            for model_name, scores in all_models.items():
                row[model_name] = scores[metric]["value"]
            row["Threshold"] = self.thresholds.get(metric, None)

            # Determine best: lower-is-better for MAE, RMSE, MAPE; higher-is-better otherwise
            values = {m: scores[metric]["value"] for m, scores in all_models.items()}
            if metric in ("MAE", "RMSE", "MAPE"):
                row["Best"] = min(values, key=values.get)  # type: ignore[arg-type]
            else:
                row["Best"] = max(values, key=values.get)  # type: ignore[arg-type]
            rows.append(row)

        return pd.DataFrame(rows).set_index("Metric")

    # ------------------------------------------------------------------ #
    # 5. HTML evaluation report
    # ------------------------------------------------------------------ #

    def generate_evaluation_report(
        self,
        eval_results: Dict[str, Any],
        save_path: Optional[str] = None,
    ) -> str:
        """Generate a self-contained HTML evaluation report.

        The report includes:
        * Metrics table with pass/fail badges
        * Actual-vs-predicted scatter plot (Plotly)
        * Prediction-error histogram (Plotly)
        * Tier confusion-matrix heatmap (Plotly)

        Parameters
        ----------
        eval_results : dict
            Must contain:
            ``"metrics"`` – output of :meth:`compute_all_metrics`,
            ``"y_true"``  – array of true scores,
            ``"y_pred"``  – array of predicted scores.
            Optionally ``"tier_eval"`` from :meth:`evaluate_priority_tiers`.
        save_path : str or None
            File path for the HTML report.  Defaults to
            ``REPORTS_DIR / "evaluation_report.html"``.

        Returns
        -------
        str
            The full HTML string.
        """
        import plotly.graph_objects as go

        metrics = eval_results["metrics"]
        y_true = np.asarray(eval_results["y_true"], dtype=np.float64)
        y_pred = np.asarray(eval_results["y_pred"], dtype=np.float64)

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # ── Metrics table ──
        metric_rows = ""
        for name, info in metrics.items():
            badge = "✅" if info["pass"] else "❌"
            metric_rows += (
                f"<tr><td>{name}</td><td>{info['value']:.4f}</td>"
                f"<td>{self.thresholds.get(name, 'N/A')}</td>"
                f"<td>{badge}</td></tr>\n"
            )

        # ── Scatter plot ──
        scatter = go.Figure()
        scatter.add_trace(go.Scatter(
            x=y_true.tolist(), y=y_pred.tolist(),
            mode="markers", marker=dict(size=4, opacity=0.5),
            name="Predictions",
        ))
        scatter.add_trace(go.Scatter(
            x=[0, 1], y=[0, 1],
            mode="lines", line=dict(dash="dash", color="red"),
            name="Ideal",
        ))
        scatter.update_layout(
            title="Actual vs Predicted",
            xaxis_title="Actual", yaxis_title="Predicted",
            width=600, height=500,
        )
        scatter_html = scatter.to_html(full_html=False, include_plotlyjs="cdn")

        # ── Error histogram ──
        errors = (y_pred - y_true).tolist()
        hist = go.Figure()
        hist.add_trace(go.Histogram(x=errors, nbinsx=50, name="Error"))
        hist.update_layout(
            title="Prediction Error Distribution",
            xaxis_title="Error (pred − actual)", yaxis_title="Count",
            width=600, height=400,
        )
        hist_html = hist.to_html(full_html=False, include_plotlyjs=False)

        # ── Confusion-matrix heatmap ──
        cm_html = ""
        tier_eval = eval_results.get("tier_eval")
        if tier_eval is not None:
            labels = tier_eval["tier_labels"]
            cm = np.array(tier_eval["confusion_matrix"])
            heatmap = go.Figure(data=go.Heatmap(
                z=cm.tolist(),
                x=labels, y=labels,
                colorscale="Blues", showscale=True,
                text=cm.tolist(), texttemplate="%{text}",
            ))
            heatmap.update_layout(
                title="Tier Confusion Matrix",
                xaxis_title="Predicted Tier", yaxis_title="Actual Tier",
                width=550, height=500,
            )
            cm_html = heatmap.to_html(full_html=False, include_plotlyjs=False)

        # ── Assemble HTML ──
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Restock ML Evaluation Report</title>
<style>
body {{ font-family: Arial, sans-serif; margin: 2rem; }}
table {{ border-collapse: collapse; margin-bottom: 1.5rem; }}
th, td {{ border: 1px solid #ccc; padding: 6px 12px; text-align: center; }}
th {{ background: #f4f4f4; }}
h1 {{ color: #333; }}
.chart {{ margin-bottom: 2rem; }}
</style>
</head>
<body>
<h1>Restock ML — Evaluation Report</h1>
<p>Generated: {timestamp}</p>

<h2>Metrics Summary</h2>
<table>
<tr><th>Metric</th><th>Value</th><th>Threshold</th><th>Status</th></tr>
{metric_rows}
</table>

<div class="chart"><h2>Actual vs Predicted</h2>{scatter_html}</div>
<div class="chart"><h2>Error Distribution</h2>{hist_html}</div>
{"<div class='chart'><h2>Tier Confusion Matrix</h2>" + cm_html + "</div>" if cm_html else ""}
</body>
</html>"""

        if save_path is None:
            save_path = str(REPORTS_DIR / "evaluation_report.html")

        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        Path(save_path).write_text(html, encoding="utf-8")
        return html

    # ------------------------------------------------------------------ #
    # 6. Model drift detection
    # ------------------------------------------------------------------ #

    def detect_model_drift(
        self,
        y_true_new: np.ndarray,
        y_pred_new: np.ndarray,
        baseline_metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Detect model drift by comparing current performance to a baseline.

        Alerts are raised when:
        * RMSE degrades (increases) by more than 0.03
        * R² drops by more than 0.05

        Parameters
        ----------
        y_true_new, y_pred_new : array-like
            New ground-truth and predicted scores.
        baseline_metrics : dict
            Output of :meth:`compute_all_metrics` from the original
            evaluation (used as the reference).

        Returns
        -------
        dict
            ``"current_metrics"`` – new metric values,
            ``"drift_detected"`` – bool,
            ``"alerts"``         – list of human-readable alert strings.
        """
        y_true_new = np.asarray(y_true_new, dtype=np.float64)
        y_pred_new = np.asarray(y_pred_new, dtype=np.float64)

        current = self.compute_all_metrics(y_true_new, y_pred_new)

        alerts: List[str] = []

        rmse_baseline = baseline_metrics["RMSE"]["value"]
        rmse_current = current["RMSE"]["value"]
        rmse_delta = rmse_current - rmse_baseline
        if rmse_delta > 0.03:
            alerts.append(
                f"RMSE drift: {rmse_baseline:.4f} → {rmse_current:.4f} "
                f"(Δ = +{rmse_delta:.4f}, threshold 0.03)"
            )

        r2_baseline = baseline_metrics["R2"]["value"]
        r2_current = current["R2"]["value"]
        r2_delta = r2_baseline - r2_current
        if r2_delta > 0.05:
            alerts.append(
                f"R² drift: {r2_baseline:.4f} → {r2_current:.4f} "
                f"(Δ = -{r2_delta:.4f}, threshold 0.05)"
            )

        return {
            "current_metrics": current,
            "drift_detected": len(alerts) > 0,
            "alerts": alerts,
        }
