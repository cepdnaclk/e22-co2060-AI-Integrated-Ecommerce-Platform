"""
SHAP-based Model Explainability for the Restock Priority ML system.

Provides local (per-SKU) and global feature-importance explanations
using SHAP values for the XGBoost, LightGBM, and MLP ensemble.
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from pandas import DataFrame

# ── Project config import ──
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import ALL_FEATURES, PRIORITY_TIERS, REPORTS_DIR  # noqa: E402

# ── Graceful SHAP import ──
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    shap = None  # type: ignore[assignment]
    SHAP_AVAILABLE = False

# ── Matplotlib (fallback for plotting) ──
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    MPL_AVAILABLE = True
except ImportError:
    plt = None  # type: ignore[assignment]
    MPL_AVAILABLE = False

logger = logging.getLogger(__name__)

FEATURE_NAMES: List[str] = [
    "D", "S", "L", "P", "SC", "HC", "SR", "SE",
    "MV", "CCR", "DFE", "WU", "CFP", "ITR",
    "SCDI", "IDR", "GRI", "CPP", "PED", "IBG",
    "MCI", "CSC", "BLI", "IR", "SCI", "PPR",
    "SCR", "GSCV", "SFH", "SDCV", "ISI", "CEI",
]


def _get_priority_tier(score: float) -> str:
    """Return the tier label for a given priority score."""
    for tier_name, info in PRIORITY_TIERS.items():
        if info["min"] <= score <= info["max"]:
            return tier_name
    return "LOW"


class ModelExplainer:
    """SHAP-based explainability wrapper for the restock ensemble."""

    def __init__(self) -> None:
        self.xgb_explainer: Optional[Any] = None
        self.lgbm_explainer: Optional[Any] = None
        self.mlp_explainer: Optional[Any] = None
        self._is_setup: bool = False

    # ------------------------------------------------------------------ #
    # 1. Setup explainers
    # ------------------------------------------------------------------ #

    def setup_explainers(
        self,
        xgb_model: Any,
        lgbm_model: Any,
        mlp_model: Any,
        X_background: np.ndarray,
    ) -> None:
        """Initialise SHAP explainers for each base learner.

        Parameters
        ----------
        xgb_model : XGBRegressor
            Trained XGBoost model.
        lgbm_model : LGBMRegressor
            Trained LightGBM model.
        mlp_model : callable
            Trained MLP model (must accept ``np.ndarray`` and return predictions).
        X_background : np.ndarray
            Background dataset used by KernelExplainer.  A subsample of
            100 rows is taken automatically.
        """
        if not SHAP_AVAILABLE:
            logger.warning("shap is not installed – explainers will return placeholders.")
            self._is_setup = False
            return

        X_background = np.asarray(X_background, dtype=np.float32)

        # Tree-based explainers
        self.xgb_explainer = shap.TreeExplainer(xgb_model)
        self.lgbm_explainer = shap.TreeExplainer(lgbm_model)

        # MLP: KernelExplainer with a 100-row background sample
        n_bg = min(100, X_background.shape[0])
        indices = np.random.choice(X_background.shape[0], size=n_bg, replace=False)
        bg_sample = X_background[indices]
        self.mlp_explainer = shap.KernelExplainer(mlp_model, bg_sample)

        self._is_setup = True
        logger.info("SHAP explainers initialised (TreeExplainer ×2, KernelExplainer ×1).")

    # ------------------------------------------------------------------ #
    # 2. Explain a single SKU
    # ------------------------------------------------------------------ #

    def explain_single_sku(
        self,
        sku_features: np.ndarray,
        sku_id: str,
    ) -> Dict[str, Any]:
        """Compute SHAP-based explanation for a single SKU.

        Parameters
        ----------
        sku_features : np.ndarray
            1-D or 2-D array of feature values for one SKU.
        sku_id : str
            Identifier for the SKU.

        Returns
        -------
        dict
            Keys: ``sku_id``, ``base_value``, ``final_score``,
            ``feature_contributions``, ``top_3_positive``,
            ``top_3_negative``, ``human_explanation``.
        """
        sku_features = np.asarray(sku_features, dtype=np.float32)
        if sku_features.ndim == 1:
            sku_features = sku_features.reshape(1, -1)

        if not self._is_setup or not SHAP_AVAILABLE:
            return self._placeholder_single(sku_id, sku_features)

        # Average SHAP values across the three explainers
        sv_xgb = self.xgb_explainer.shap_values(sku_features)
        sv_lgbm = self.lgbm_explainer.shap_values(sku_features)
        sv_mlp = self.mlp_explainer.shap_values(sku_features)

        shap_vals = (np.asarray(sv_xgb) + np.asarray(sv_lgbm) + np.asarray(sv_mlp)) / 3.0
        shap_vals = shap_vals.flatten()

        base_value = float(
            (self.xgb_explainer.expected_value + self.lgbm_explainer.expected_value) / 2.0
        )
        final_score = float(base_value + shap_vals.sum())

        return self._build_single_result(sku_id, base_value, final_score, shap_vals)

    # ------------------------------------------------------------------ #
    # 3. Human-readable explanation
    # ------------------------------------------------------------------ #

    @staticmethod
    def generate_human_explanation(shap_result: Dict[str, Any]) -> str:
        """Convert a SHAP result dict into a plain-English sentence.

        Parameters
        ----------
        shap_result : dict
            Output of :meth:`explain_single_sku`.

        Returns
        -------
        str
            Human-readable explanation string.
        """
        tier = _get_priority_tier(shap_result.get("final_score", 0.0))
        positives = shap_result.get("top_3_positive", [])
        negatives = shap_result.get("top_3_negative", [])

        parts: List[str] = []
        for name, val in positives:
            parts.append(f"{name} is elevated ({val:+.2f})")
        for name, val in negatives:
            parts.append(f"{name} is reduced ({val:+.2f})")

        drivers = ", ".join(parts) if parts else "no dominant drivers detected"
        return (
            f"This item has {tier} priority primarily because {drivers}."
        )

    # ------------------------------------------------------------------ #
    # 4. Batch explanation
    # ------------------------------------------------------------------ #

    def explain_batch(self, X_df: DataFrame) -> DataFrame:
        """Compute SHAP values for every row in a DataFrame.

        Parameters
        ----------
        X_df : DataFrame
            Feature DataFrame (columns should align with ``FEATURE_NAMES``).

        Returns
        -------
        DataFrame
            Same shape as *X_df* with SHAP values as entries.
        """
        X = X_df.values.astype(np.float32)

        if not self._is_setup or not SHAP_AVAILABLE:
            logger.warning("SHAP unavailable – returning zeros for batch explanation.")
            return pd.DataFrame(np.zeros_like(X), columns=X_df.columns, index=X_df.index)

        sv_xgb = np.asarray(self.xgb_explainer.shap_values(X))
        sv_lgbm = np.asarray(self.lgbm_explainer.shap_values(X))
        sv_mlp = np.asarray(self.mlp_explainer.shap_values(X))

        avg_shap = (sv_xgb + sv_lgbm + sv_mlp) / 3.0

        return pd.DataFrame(avg_shap, columns=X_df.columns, index=X_df.index)

    # ------------------------------------------------------------------ #
    # 5. Global feature importance
    # ------------------------------------------------------------------ #

    def global_feature_importance(self, X_df: DataFrame) -> DataFrame:
        """Rank features by mean absolute SHAP value.

        Parameters
        ----------
        X_df : DataFrame
            Feature DataFrame.

        Returns
        -------
        DataFrame
            Columns ``feature`` and ``mean_abs_shap``, sorted descending.
        """
        shap_df = self.explain_batch(X_df)
        importance = shap_df.abs().mean().sort_values(ascending=False)
        return pd.DataFrame({
            "feature": importance.index,
            "mean_abs_shap": importance.values,
        }).reset_index(drop=True)

    # ------------------------------------------------------------------ #
    # 6. Transparency report
    # ------------------------------------------------------------------ #

    def generate_transparency_report(
        self,
        sku_id: str,
        shap_result: Dict[str, Any],
        weights: Dict[str, float],
        external_factors: Dict[str, float],
    ) -> Dict[str, Any]:
        """Generate a full per-SKU transparency report.

        Parameters
        ----------
        sku_id : str
            SKU identifier.
        shap_result : dict
            Output of :meth:`explain_single_sku`.
        weights : dict
            AHP or fallback weight dict (e.g. ``{"w1": 0.25, ...}``).
        external_factors : dict
            Raw external factor values for this SKU.

        Returns
        -------
        dict
            Comprehensive transparency report.
        """
        tier = _get_priority_tier(shap_result.get("final_score", 0.0))
        tier_info = PRIORITY_TIERS.get(tier, {})

        return {
            "sku_id": sku_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "final_score": shap_result.get("final_score"),
            "priority_tier": tier,
            "recommended_action": tier_info.get("action", "N/A"),
            "response_window": tier_info.get("response", "N/A"),
            "base_value": shap_result.get("base_value"),
            "feature_contributions": shap_result.get("feature_contributions", {}),
            "top_3_positive": shap_result.get("top_3_positive", []),
            "top_3_negative": shap_result.get("top_3_negative", []),
            "human_explanation": shap_result.get("human_explanation", ""),
            "weights_used": weights,
            "external_factors": external_factors,
        }

    # ------------------------------------------------------------------ #
    # 7. Waterfall plot
    # ------------------------------------------------------------------ #

    def plot_waterfall(
        self,
        sku_id: str,
        shap_result: Dict[str, Any],
        save_path: Optional[str] = None,
    ) -> str:
        """Save a SHAP waterfall chart for a single SKU as PNG.

        Parameters
        ----------
        sku_id : str
            SKU identifier (used in the title).
        shap_result : dict
            Output of :meth:`explain_single_sku`.
        save_path : str, optional
            File path for the PNG.  Defaults to ``REPORTS_DIR/<sku_id>_waterfall.png``.

        Returns
        -------
        str
            Absolute path to the saved image.
        """
        if save_path is None:
            save_path = str(REPORTS_DIR / f"{sku_id}_waterfall.png")

        contributions = shap_result.get("feature_contributions", {})
        base_value = shap_result.get("base_value", 0.0)
        features = list(contributions.keys())
        values = np.array(list(contributions.values()))

        # Try native SHAP plot first
        if SHAP_AVAILABLE:
            try:
                explanation = shap.Explanation(
                    values=values,
                    base_values=base_value,
                    feature_names=features,
                )
                shap.plots.waterfall(explanation, show=False)
                plt.title(f"SHAP Waterfall – {sku_id}")
                plt.tight_layout()
                plt.savefig(save_path, dpi=150)
                plt.close()
                logger.info("Waterfall plot saved to %s", save_path)
                return save_path
            except Exception as exc:
                logger.warning("Native SHAP waterfall failed (%s), falling back to matplotlib.", exc)

        # Matplotlib fallback
        if not MPL_AVAILABLE:
            logger.error("Neither shap plots nor matplotlib are available.")
            return save_path

        sorted_idx = np.argsort(np.abs(values))[::-1]
        sorted_features = [features[i] for i in sorted_idx]
        sorted_values = values[sorted_idx]

        fig, ax = plt.subplots(figsize=(8, max(4, len(features) * 0.35)))
        colors = ["#ff4136" if v > 0 else "#2ecc40" for v in sorted_values]
        ax.barh(range(len(sorted_features)), sorted_values, color=colors)
        ax.set_yticks(range(len(sorted_features)))
        ax.set_yticklabels(sorted_features)
        ax.invert_yaxis()
        ax.set_xlabel("SHAP value")
        ax.set_title(f"SHAP Waterfall – {sku_id}")
        fig.tight_layout()
        fig.savefig(save_path, dpi=150)
        plt.close(fig)
        logger.info("Waterfall plot (matplotlib fallback) saved to %s", save_path)
        return save_path

    # ------------------------------------------------------------------ #
    # 8. Beeswarm plot
    # ------------------------------------------------------------------ #

    def plot_beeswarm(
        self,
        shap_values: np.ndarray,
        X_df: DataFrame,
        save_path: Optional[str] = None,
    ) -> str:
        """Save a global SHAP beeswarm plot as PNG.

        Parameters
        ----------
        shap_values : np.ndarray
            SHAP value matrix of shape ``(n_samples, n_features)``.
        X_df : DataFrame
            Original feature DataFrame (used for colouring by feature value).
        save_path : str, optional
            File path for the PNG.  Defaults to ``REPORTS_DIR/beeswarm.png``.

        Returns
        -------
        str
            Absolute path to the saved image.
        """
        if save_path is None:
            save_path = str(REPORTS_DIR / "beeswarm.png")

        shap_values = np.asarray(shap_values)

        # Try native SHAP beeswarm
        if SHAP_AVAILABLE:
            try:
                explanation = shap.Explanation(
                    values=shap_values,
                    data=X_df.values,
                    feature_names=list(X_df.columns),
                )
                shap.plots.beeswarm(explanation, show=False)
                plt.tight_layout()
                plt.savefig(save_path, dpi=150)
                plt.close()
                logger.info("Beeswarm plot saved to %s", save_path)
                return save_path
            except Exception as exc:
                logger.warning("Native SHAP beeswarm failed (%s), falling back to matplotlib.", exc)

        # Matplotlib fallback: simple mean-|SHAP| bar chart
        if not MPL_AVAILABLE:
            logger.error("Neither shap plots nor matplotlib are available.")
            return save_path

        mean_abs = np.mean(np.abs(shap_values), axis=0)
        feature_names = list(X_df.columns)
        sorted_idx = np.argsort(mean_abs)[::-1]

        fig, ax = plt.subplots(figsize=(8, max(4, len(feature_names) * 0.3)))
        ax.barh(
            range(len(feature_names)),
            mean_abs[sorted_idx],
            color="#1f77b4",
        )
        ax.set_yticks(range(len(feature_names)))
        ax.set_yticklabels([feature_names[i] for i in sorted_idx])
        ax.invert_yaxis()
        ax.set_xlabel("mean(|SHAP value|)")
        ax.set_title("Global Feature Importance (Beeswarm fallback)")
        fig.tight_layout()
        fig.savefig(save_path, dpi=150)
        plt.close(fig)
        logger.info("Beeswarm plot (matplotlib fallback) saved to %s", save_path)
        return save_path

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _build_single_result(
        sku_id: str,
        base_value: float,
        final_score: float,
        shap_vals: np.ndarray,
    ) -> Dict[str, Any]:
        """Assemble the explanation dict for a single SKU."""
        names = FEATURE_NAMES[: len(shap_vals)]
        contributions = {name: float(val) for name, val in zip(names, shap_vals)}

        sorted_pairs = sorted(contributions.items(), key=lambda x: x[1], reverse=True)
        top_3_positive = [(n, v) for n, v in sorted_pairs if v > 0][:3]
        top_3_negative = [(n, v) for n, v in sorted_pairs if v < 0][-3:]

        result: Dict[str, Any] = {
            "sku_id": sku_id,
            "base_value": base_value,
            "final_score": final_score,
            "feature_contributions": contributions,
            "top_3_positive": top_3_positive,
            "top_3_negative": top_3_negative,
            "human_explanation": "",
        }
        result["human_explanation"] = ModelExplainer.generate_human_explanation(result)
        return result

    @staticmethod
    def _placeholder_single(sku_id: str, sku_features: np.ndarray) -> Dict[str, Any]:
        """Return a placeholder result when SHAP is unavailable."""
        n_feats = sku_features.shape[1]
        names = FEATURE_NAMES[:n_feats]
        contributions = {name: 0.0 for name in names}

        result: Dict[str, Any] = {
            "sku_id": sku_id,
            "base_value": 0.0,
            "final_score": 0.0,
            "feature_contributions": contributions,
            "top_3_positive": [],
            "top_3_negative": [],
            "human_explanation": "SHAP is not installed – explanation unavailable.",
        }
        return result
