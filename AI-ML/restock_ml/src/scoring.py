"""
Master Priority Score Engine for the Restock Priority ML system.

Computes the Priority Score (PS) for each SKU using the master formula:

    PS = w1·D_n + w2·(1 − S_n) + w3·L_n + w4·P_n
       + w5·SC_n + w6·(1 − HC_n) + w7·SR_n + w8·SE_n

The inversions for S_n and HC_n are applied **inside** the scoring formula,
not during the normalization step.
"""

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from pandas import DataFrame

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import PRIORITY_TIERS

# Ordered primary variable names aligned with weights w1–w8.
_VAR_KEYS: List[str] = ["D", "S", "L", "P", "SC", "HC", "SR", "SE"]
_WEIGHT_KEYS: List[str] = [f"w{i}" for i in range(1, 9)]

# Variables whose normalized values are inverted *inside* the formula.
_INVERTED_IN_FORMULA = {"S", "HC"}


class PriorityScoreEngine:
    """Compute, classify, and report Priority Scores for SKUs."""

    # ------------------------------------------------------------------
    # Core scoring
    # ------------------------------------------------------------------

    @staticmethod
    def compute_score(
        variables_normalized: Dict[str, float],
        weights: Dict[str, float],
    ) -> float:
        """Apply the master formula and return the Priority Score.

        Parameters
        ----------
        variables_normalized : dict
            Normalized primary variable values keyed by variable name
            (``"D"``, ``"S"``, ``"L"``, ``"P"``, ``"SC"``, ``"HC"``,
            ``"SR"``, ``"SE"``).  Values should be in [0, 1].
        weights : dict
            Weight values keyed ``"w1"`` … ``"w8"`` (should sum to 1.0).

        Returns
        -------
        float
            Priority Score clipped to [0, 1].
        """
        score = 0.0
        for wk, vk in zip(_WEIGHT_KEYS, _VAR_KEYS):
            w = weights.get(wk, 0.0)
            v = variables_normalized.get(vk, 0.0)
            if vk in _INVERTED_IN_FORMULA:
                v = 1.0 - v
            score += w * v
        return float(np.clip(score, 0.0, 1.0))

    # ------------------------------------------------------------------
    # Priority tier lookup
    # ------------------------------------------------------------------

    @staticmethod
    def get_priority_tier(score: float) -> Dict[str, Any]:
        """Return the priority tier information for a given score.

        Parameters
        ----------
        score : float
            Priority Score in [0, 1].

        Returns
        -------
        dict
            ``tier``          – tier label (CRITICAL / HIGH / MEDIUM / LOW)
            ``action``        – recommended action string
            ``response_time`` – expected response window
        """
        for tier_name, info in PRIORITY_TIERS.items():
            if info["min"] <= score <= info["max"]:
                return {
                    "tier": tier_name,
                    "action": info["action"],
                    "response_time": info["response"],
                }
        # Fallback for edge-case rounding
        return {
            "tier": "LOW",
            "action": PRIORITY_TIERS["LOW"]["action"],
            "response_time": PRIORITY_TIERS["LOW"]["response"],
        }

    # ------------------------------------------------------------------
    # Variable contributions
    # ------------------------------------------------------------------

    @staticmethod
    def compute_variable_contributions(
        variables_n: Dict[str, float],
        weights: Dict[str, float],
    ) -> Dict[str, float]:
        """Compute each variable's weighted contribution to the score.

        Parameters
        ----------
        variables_n : dict
            Normalized variable values (same keys as *compute_score*).
        weights : dict
            Weight values ``"w1"`` … ``"w8"``.

        Returns
        -------
        dict
            Mapping of variable name to its individual contribution
            (``w_i * effective_var_value``).
        """
        contributions: Dict[str, float] = {}
        for wk, vk in zip(_WEIGHT_KEYS, _VAR_KEYS):
            w = weights.get(wk, 0.0)
            v = variables_n.get(vk, 0.0)
            if vk in _INVERTED_IN_FORMULA:
                v = 1.0 - v
            contributions[vk] = w * v
        return contributions

    # ------------------------------------------------------------------
    # Single-SKU pipeline
    # ------------------------------------------------------------------

    def score_single_sku(
        self,
        sku_data: Dict[str, Any],
        external_factors: Dict[str, float],
        normalizer: Any,
        weight_engine: Any,
    ) -> Dict[str, Any]:
        """Run the full scoring pipeline for one SKU.

        Steps: extract raw variables → normalize → compute weights →
        apply master formula → classify tier.

        Parameters
        ----------
        sku_data : dict
            Must contain ``"SKU_ID"`` and raw values for all 8 primary
            variables (``"D"``, ``"S"``, ``"L"``, ``"P"``, ``"SC"``,
            ``"HC"``, ``"SR"``, ``"SE"``).
        external_factors : dict
            External factor values forwarded to *weight_engine*.
        normalizer : Normalizer
            A fitted ``Normalizer`` instance (must expose ``transform``).
        weight_engine : WeightEngine
            Instance with a ``compute_weights`` method.

        Returns
        -------
        dict
            ``sku_id``, ``score``, ``tier``, ``action``, ``response_time``,
            ``variable_contributions``, ``weights_used``, ``timestamp``.
        """
        sku_id = sku_data.get("SKU_ID", "UNKNOWN")

        # 1. Build single-row DataFrame of raw primary variables
        raw_values = {k: [sku_data.get(k, 0.0)] for k in _VAR_KEYS}
        raw_df = pd.DataFrame(raw_values)

        # 2. Normalize
        norm_df = normalizer.transform(raw_df)
        variables_n: Dict[str, float] = norm_df.iloc[0].to_dict()

        # 3. Compute dynamic weights
        weights = weight_engine.compute_weights(external_factors)

        # 4. Apply master formula
        score = self.compute_score(variables_n, weights)

        # 5. Tier classification
        tier_info = self.get_priority_tier(score)

        # 6. Variable contributions
        contributions = self.compute_variable_contributions(variables_n, weights)

        return {
            "sku_id": sku_id,
            "score": score,
            "tier": tier_info["tier"],
            "action": tier_info["action"],
            "response_time": tier_info["response_time"],
            "variable_contributions": contributions,
            "weights_used": weights,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------
    # Batch scoring
    # ------------------------------------------------------------------

    def score_batch(
        self,
        sku_df: DataFrame,
        external_factors: Dict[str, float],
        normalizer: Any,
        weight_engine: Any,
    ) -> DataFrame:
        """Score every row in *sku_df* and return results sorted by score.

        Parameters
        ----------
        sku_df : DataFrame
            Must contain ``"SKU_ID"`` and columns for all 8 primary
            variables.
        external_factors : dict
            External factor values forwarded to *weight_engine*.
        normalizer : Normalizer
            A fitted ``Normalizer`` instance.
        weight_engine : WeightEngine
            Instance with a ``compute_weights`` method.

        Returns
        -------
        DataFrame
            Columns: ``SKU_ID``, ``score``, ``tier``, ``action``,
            ``response_time``.  Sorted descending by ``score``.
        """
        # Normalize all primary variables at once
        var_df = sku_df[_VAR_KEYS].copy()
        norm_df = normalizer.transform(var_df)

        # Compute weights once (same external context for the batch)
        weights = weight_engine.compute_weights(external_factors)

        records: List[Dict[str, Any]] = []
        for idx in norm_df.index:
            variables_n = norm_df.loc[idx].to_dict()
            score = self.compute_score(variables_n, weights)
            tier_info = self.get_priority_tier(score)
            records.append({
                "SKU_ID": sku_df.at[idx, "SKU_ID"],
                "score": score,
                "tier": tier_info["tier"],
                "action": tier_info["action"],
                "response_time": tier_info["response_time"],
            })

        result_df = pd.DataFrame(records)
        return result_df.sort_values("score", ascending=False).reset_index(drop=True)

    # ------------------------------------------------------------------
    # Critical-SKU detection
    # ------------------------------------------------------------------

    @staticmethod
    def detect_critical_skus(
        scores_df: DataFrame,
        threshold: float = 0.75,
    ) -> DataFrame:
        """Filter SKUs whose score meets or exceeds *threshold*.

        Parameters
        ----------
        scores_df : DataFrame
            Must contain a ``"score"`` column (e.g. output of
            ``score_batch``).
        threshold : float
            Minimum score to be considered critical (default 0.75).

        Returns
        -------
        DataFrame
            Subset of *scores_df* with ``score >= threshold``, sorted
            descending by score.
        """
        critical = scores_df[scores_df["score"] >= threshold].copy()
        return critical.sort_values("score", ascending=False).reset_index(drop=True)
