"""
Dynamic Weight Computation Engine for the Restock Priority ML system.

Computes adaptive weights (w1–w8) from 24 external factors, normalises
them so they sum to 1.0, and provides AHP-based consistency checking.

Weight Formulas
---------------
w1_raw = (MV + CCR + DFE) / 3
w2_raw = 0.4*WU + 0.3*CFP + 0.3*(1 / max(ITR, 0.001))
w3_raw = (SCDI + IDR + GRI) / 3
w4_raw = 0.4*CPP + 0.3*PED + 0.3*IBG
w5_raw = (MCI + (1 - CSC) + (1 - BLI)) / 3
w6_raw = 0.3*IR + 0.3*SCI + 0.4*PPR
w7_raw = (SCR + GSCV + (1 - SFH)) / 3
w8_raw = 0.4*SDCV + 0.3*ISI + 0.3*CEI

Normalisation: w_i_final = w_i_raw / sum(all w_raw)  →  w1+…+w8 = 1.0
"""

from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd


# ── Fallback weights (used when computation fails) ──────────────────────────
FALLBACK_WEIGHTS: Dict[str, float] = {
    "w1": 0.25,
    "w2": 0.20,
    "w3": 0.15,
    "w4": 0.10,
    "w5": 0.10,
    "w6": 0.08,
    "w7": 0.07,
    "w8": 0.05,
}

_WEIGHT_KEYS: List[str] = [f"w{i}" for i in range(1, 9)]
_EQUAL_WEIGHT: float = 1.0 / 8  # 0.125
_DEVIATION_THRESHOLD: float = 0.15


# ═══════════════════════════════════════════════════════════════════════════════
# WeightEngine
# ═══════════════════════════════════════════════════════════════════════════════

class WeightEngine:
    """Compute, validate and report dynamic weights from external factors."""

    # ── public API ──────────────────────────────────────────────────────────

    def compute_weights(self, external_factors: Dict[str, float]) -> Dict[str, float]:
        """Compute normalised weights w1–w8 from external factor values.

        Parameters
        ----------
        external_factors : dict
            Mapping of factor abbreviation (e.g. ``"MV"``, ``"CCR"``, …) to
            its current value (float, typically in [0, 1]).

        Returns
        -------
        dict
            ``{"w1": …, "w2": …, …, "w8": …}`` normalised so the values
            sum to 1.0.  Falls back to :data:`FALLBACK_WEIGHTS` when the
            raw weights cannot be computed (e.g. all-zero inputs).
        """
        try:
            raw = self._compute_raw(external_factors)
            total = sum(raw.values())
            if total <= 0:
                return dict(FALLBACK_WEIGHTS)
            return {k: v / total for k, v in raw.items()}
        except Exception:
            return dict(FALLBACK_WEIGHTS)

    def compute_weights_history(
        self, factors_df: pd.DataFrame
    ) -> pd.DataFrame:
        """Compute weights for every row (time-step) in *factors_df*.

        Parameters
        ----------
        factors_df : DataFrame
            Each row contains a full set of external factor columns
            (``MV``, ``CCR``, ``DFE``, …).

        Returns
        -------
        DataFrame
            A DataFrame with columns ``w1``–``w8``, one row per input row.
        """
        records: List[Dict[str, float]] = []
        for _, row in factors_df.iterrows():
            weights = self.compute_weights(row.to_dict())
            records.append(weights)
        return pd.DataFrame(records, index=factors_df.index)

    def generate_weight_report(
        self,
        weights: Dict[str, float],
        external_factors: Dict[str, float],
    ) -> Dict[str, Any]:
        """Produce a human-readable report for a set of computed weights.

        Parameters
        ----------
        weights : dict
            Normalised weights ``{"w1": …, …, "w8": …}``.
        external_factors : dict
            The external factor values that produced these weights.

        Returns
        -------
        dict
            ``weight_values``   – copy of *weights*
            ``driving_factors`` – mapping of each weight key to its
                                  contributing factor names
            ``dominant_weight`` – the key with the largest weight
            ``deviation_flags`` – list of weight keys that deviate more
                                  than 0.15 from the equal share (0.125)
        """
        factor_groups: Dict[str, List[str]] = {
            "w1": ["MV", "CCR", "DFE"],
            "w2": ["WU", "CFP", "ITR"],
            "w3": ["SCDI", "IDR", "GRI"],
            "w4": ["CPP", "PED", "IBG"],
            "w5": ["MCI", "CSC", "BLI"],
            "w6": ["IR", "SCI", "PPR"],
            "w7": ["SCR", "GSCV", "SFH"],
            "w8": ["SDCV", "ISI", "CEI"],
        }

        driving_factors: Dict[str, Dict[str, Optional[float]]] = {}
        for wk, factors in factor_groups.items():
            driving_factors[wk] = {
                f: external_factors.get(f) for f in factors
            }

        dominant_weight = max(weights, key=lambda k: weights[k])

        deviation_flags: List[str] = [
            k for k in _WEIGHT_KEYS
            if abs(weights.get(k, 0.0) - _EQUAL_WEIGHT) > _DEVIATION_THRESHOLD
        ]

        return {
            "weight_values": dict(weights),
            "driving_factors": driving_factors,
            "dominant_weight": dominant_weight,
            "deviation_flags": deviation_flags,
        }

    @staticmethod
    def validate_weights(weights: Dict[str, float]) -> bool:
        """Check that all weights are in [0, 1] and sum to 1.0 ± 0.001.

        Parameters
        ----------
        weights : dict
            ``{"w1": …, …, "w8": …}``

        Returns
        -------
        bool
        """
        if not all(k in weights for k in _WEIGHT_KEYS):
            return False
        values = [weights[k] for k in _WEIGHT_KEYS]
        if any(v < 0.0 or v > 1.0 for v in values):
            return False
        return abs(sum(values) - 1.0) <= 0.001

    # ── internal helpers ────────────────────────────────────────────────────

    @staticmethod
    def _get(factors: Dict[str, float], key: str, default: float = 0.0) -> float:
        """Retrieve a factor value, falling back to *default*."""
        val = factors.get(key, default)
        try:
            return float(val)
        except (TypeError, ValueError):
            return default

    def _compute_raw(self, f: Dict[str, float]) -> Dict[str, float]:
        """Return un-normalised raw weights from external factors."""
        g = self._get

        MV = g(f, "MV")
        CCR = g(f, "CCR")
        DFE = g(f, "DFE")
        w1_raw = (MV + CCR + DFE) / 3.0

        WU = g(f, "WU")
        CFP = g(f, "CFP")
        ITR = g(f, "ITR")
        w2_raw = 0.4 * WU + 0.3 * CFP + 0.3 * (1.0 / max(ITR, 0.001))

        SCDI = g(f, "SCDI")
        IDR = g(f, "IDR")
        GRI = g(f, "GRI")
        w3_raw = (SCDI + IDR + GRI) / 3.0

        CPP = g(f, "CPP")
        PED = g(f, "PED")
        IBG = g(f, "IBG")
        w4_raw = 0.4 * CPP + 0.3 * PED + 0.3 * IBG

        MCI = g(f, "MCI")
        CSC = g(f, "CSC")
        BLI = g(f, "BLI")
        w5_raw = (MCI + (1.0 - CSC) + (1.0 - BLI)) / 3.0

        IR = g(f, "IR")
        SCI = g(f, "SCI")
        PPR = g(f, "PPR")
        w6_raw = 0.3 * IR + 0.3 * SCI + 0.4 * PPR

        SCR = g(f, "SCR")
        GSCV = g(f, "GSCV")
        SFH = g(f, "SFH")
        w7_raw = (SCR + GSCV + (1.0 - SFH)) / 3.0

        SDCV = g(f, "SDCV")
        ISI = g(f, "ISI")
        CEI = g(f, "CEI")
        w8_raw = 0.4 * SDCV + 0.3 * ISI + 0.3 * CEI

        return {
            "w1": w1_raw,
            "w2": w2_raw,
            "w3": w3_raw,
            "w4": w4_raw,
            "w5": w5_raw,
            "w6": w6_raw,
            "w7": w7_raw,
            "w8": w8_raw,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# AHPWeightCalculator
# ═══════════════════════════════════════════════════════════════════════════════

class AHPWeightCalculator:
    """Analytic Hierarchy Process weight calculator with consistency check."""

    RI_TABLE: Dict[int, float] = {
        1: 0.0,
        2: 0.0,
        3: 0.58,
        4: 0.90,
        5: 1.12,
        6: 1.24,
        7: 1.32,
        8: 1.41,
    }

    @staticmethod
    def build_comparison_matrix(n: int = 8) -> np.ndarray:
        """Return an *n*×*n* identity matrix as a starting comparison matrix.

        Parameters
        ----------
        n : int
            Number of criteria (default 8).

        Returns
        -------
        numpy.ndarray
            Identity matrix of shape ``(n, n)`` — the caller is expected
            to fill in pairwise comparisons.
        """
        return np.ones((n, n), dtype=float)

    @staticmethod
    def compute_ahp_weights(matrix: np.ndarray) -> np.ndarray:
        """Derive priority weights via the principal eigenvector method.

        Parameters
        ----------
        matrix : numpy.ndarray
            Square positive-reciprocal comparison matrix.

        Returns
        -------
        numpy.ndarray
            Normalised weight vector (sums to 1.0).

        Raises
        ------
        ValueError
            If *matrix* is not square or contains non-positive values.
        """
        matrix = np.asarray(matrix, dtype=float)
        if matrix.ndim != 2 or matrix.shape[0] != matrix.shape[1]:
            raise ValueError("Comparison matrix must be square.")
        if np.any(matrix <= 0):
            raise ValueError("All matrix entries must be positive.")

        eigenvalues, eigenvectors = np.linalg.eig(matrix)

        # Use the eigenvector associated with the largest real eigenvalue
        max_idx = int(np.argmax(eigenvalues.real))
        principal = np.abs(eigenvectors[:, max_idx].real)

        total = principal.sum()
        if total == 0:
            n = matrix.shape[0]
            return np.full(n, 1.0 / n)

        return principal / total

    def compute_consistency_ratio(
        self, matrix: np.ndarray, weights: np.ndarray
    ) -> float:
        """Compute the AHP Consistency Ratio (CR).

        CR = CI / RI  where  CI = (λ_max − n) / (n − 1).

        Parameters
        ----------
        matrix : numpy.ndarray
            The comparison matrix used to derive *weights*.
        weights : numpy.ndarray
            Priority vector returned by :meth:`compute_ahp_weights`.

        Returns
        -------
        float
            Consistency Ratio.  Values < 0.10 indicate acceptable
            consistency.
        """
        matrix = np.asarray(matrix, dtype=float)
        weights = np.asarray(weights, dtype=float)
        n = matrix.shape[0]

        if n <= 2:
            return 0.0

        weighted_sum = matrix @ weights
        lambda_max = float(np.mean(weighted_sum / weights))
        ci = (lambda_max - n) / (n - 1)

        ri = self.RI_TABLE.get(n, 1.41)
        if ri == 0:
            return 0.0

        return ci / ri
