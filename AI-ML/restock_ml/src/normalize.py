"""
Normalization and preprocessing pipeline for restock ML features.

Provides min-max normalization (standard and inverted), outlier handling,
missing value imputation, and distribution drift detection via PSI.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import pandas as pd
from pandas import DataFrame

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import INVERTED_COLUMNS, PROCESSED_DIR


class Normalizer:
    """Min-max normalizer with inverted scaling for select columns.

    Standard:  X_n = (X - X_min) / (X_max - X_min)
    Inverted:  X_n = 1 - (X - X_min) / (X_max - X_min)

    Inverted columns (defined in config): columns where *lower* raw values
    indicate *higher* restock priority (e.g. Stock, Holding Cost).
    """

    def __init__(self, stats_path: Optional[str] = None) -> None:
        self.feature_stats: Dict[str, Dict[str, float]] = {}
        self.stats_path = stats_path or str(PROCESSED_DIR / "feature_stats.json")

    # ------------------------------------------------------------------
    # Core API
    # ------------------------------------------------------------------

    def fit(self, X_train: DataFrame) -> "Normalizer":
        """Learn per-feature min/max from training data and persist to JSON.

        Args:
            X_train: Training dataframe with numeric feature columns.

        Returns:
            self, for method chaining.
        """
        self.feature_stats = {
            col: {"min": float(X_train[col].min()), "max": float(X_train[col].max())}
            for col in X_train.columns
        }
        Path(self.stats_path).parent.mkdir(parents=True, exist_ok=True)
        with open(self.stats_path, "w") as f:
            json.dump(self.feature_stats, f, indent=2)
        return self

    def transform(self, X: DataFrame) -> DataFrame:
        """Apply min-max normalization using stored feature stats.

        Args:
            X: Dataframe to normalize. Must contain columns seen during fit.

        Returns:
            Normalized dataframe with values in [0, 1].

        Raises:
            RuntimeError: If called before fit().
        """
        if not self.feature_stats:
            raise RuntimeError("Normalizer has not been fitted. Call fit() first.")

        X_norm = X.copy()
        for col in X_norm.columns:
            stats = self.feature_stats[col]
            col_min, col_max = stats["min"], stats["max"]
            denom = col_max - col_min

            if denom == 0:
                X_norm[col] = 0.0
            else:
                scaled = (X_norm[col] - col_min) / denom
                if col in INVERTED_COLUMNS:
                    scaled = 1.0 - scaled
                X_norm[col] = scaled

        return X_norm

    def fit_transform(self, X_train: DataFrame) -> DataFrame:
        """Convenience method: fit then transform in one call.

        Args:
            X_train: Training dataframe.

        Returns:
            Normalized training dataframe.
        """
        return self.fit(X_train).transform(X_train)

    def inverse_transform(self, X_n: DataFrame) -> DataFrame:
        """Reverse normalization back to original scale.

        Args:
            X_n: Normalized dataframe.

        Returns:
            Dataframe in the original feature scale.

        Raises:
            RuntimeError: If called before fit().
        """
        if not self.feature_stats:
            raise RuntimeError("Normalizer has not been fitted. Call fit() first.")

        X_orig = X_n.copy()
        for col in X_orig.columns:
            stats = self.feature_stats[col]
            col_min, col_max = stats["min"], stats["max"]
            denom = col_max - col_min

            values = X_orig[col]
            if col in INVERTED_COLUMNS:
                values = 1.0 - values

            X_orig[col] = values * denom + col_min

        return X_orig

    # ------------------------------------------------------------------
    # Preprocessing helpers
    # ------------------------------------------------------------------

    @staticmethod
    def handle_outliers(X: DataFrame, method: str = "winsorize") -> DataFrame:
        """Clip or winsorize outliers in numeric columns.

        Args:
            X: Input dataframe.
            method: One of 'winsorize' (1st/99th percentile), 'clip'
                    (same behaviour, alias), or 'none'.

        Returns:
            Dataframe with outliers handled.

        Raises:
            ValueError: If *method* is not recognised.
        """
        if method == "none":
            return X.copy()

        if method not in ("winsorize", "clip"):
            raise ValueError(f"Unknown outlier method: {method!r}. "
                             "Choose 'winsorize', 'clip', or 'none'.")

        X_out = X.copy()
        for col in X_out.select_dtypes(include=[np.number]).columns:
            low = X_out[col].quantile(0.01)
            high = X_out[col].quantile(0.99)
            X_out[col] = X_out[col].clip(lower=low, upper=high)
        return X_out

    @staticmethod
    def handle_missing(X: DataFrame, strategy: str = "median") -> DataFrame:
        """Fill missing values in numeric columns.

        Args:
            X: Input dataframe (may contain NaNs).
            strategy: 'median' fills with column median; 'ffill' uses
                      forward-fill (suitable for time-series data).

        Returns:
            Dataframe with missing values imputed.

        Raises:
            ValueError: If *strategy* is not recognised.
        """
        if strategy == "median":
            return X.fillna(X.median(numeric_only=True))
        if strategy == "ffill":
            return X.ffill()
        raise ValueError(f"Unknown missing-value strategy: {strategy!r}. "
                         "Choose 'median' or 'ffill'.")

    def detect_drift(
        self, X_new: DataFrame, threshold: float = 0.2
    ) -> Dict[str, Dict[str, object]]:
        """Detect distribution drift via Population Stability Index (PSI).

        PSI = SUM[ (actual% - expected%) * ln(actual% / expected%) ]

        A PSI > *threshold* signals meaningful drift for that feature.

        Args:
            X_new: New data to compare against the fitted distribution.
            threshold: PSI value above which a feature is flagged.

        Returns:
            Dict mapping column name to ``{'psi': float, 'drifted': bool}``.

        Raises:
            RuntimeError: If called before fit().
        """
        if not self.feature_stats:
            raise RuntimeError("Normalizer has not been fitted. Call fit() first.")

        n_bins = 10
        eps = 1e-4
        results: Dict[str, Dict[str, object]] = {}

        for col in X_new.columns:
            if col not in self.feature_stats:
                continue

            stats = self.feature_stats[col]
            col_min, col_max = stats["min"], stats["max"]
            bins = np.linspace(col_min, col_max, n_bins + 1)

            # Expected: uniform bucket counts derived from training range
            expected_pct = np.full(n_bins, 1.0 / n_bins)

            counts = np.histogram(X_new[col].dropna(), bins=bins)[0].astype(float)
            total = counts.sum()
            actual_pct = counts / total if total > 0 else np.full(n_bins, 1.0 / n_bins)

            # Avoid log(0) by adding small epsilon
            actual_pct = np.clip(actual_pct, eps, None)
            expected_pct = np.clip(expected_pct, eps, None)

            psi = float(np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct)))
            results[col] = {"psi": round(psi, 6), "drifted": psi > threshold}

        return results


# ------------------------------------------------------------------
# Pipeline convenience function
# ------------------------------------------------------------------


def preprocess_sku_data(
    raw_df: DataFrame,
    normalizer: Normalizer,
    handle_missing: bool = True,
    handle_outliers: bool = True,
) -> DataFrame:
    """End-to-end preprocessing: impute → winsorize → normalize.

    Args:
        raw_df: Raw feature dataframe for one or more SKUs.
        normalizer: A *fitted* Normalizer instance.
        handle_missing: Whether to impute missing values (median).
        handle_outliers: Whether to winsorize outliers.

    Returns:
        Fully preprocessed and normalized dataframe.
    """
    df = raw_df.copy()
    if handle_missing:
        df = Normalizer.handle_missing(df)
    if handle_outliers:
        df = Normalizer.handle_outliers(df)
    df = normalizer.transform(df)
    return df
