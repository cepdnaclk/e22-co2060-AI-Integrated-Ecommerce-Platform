"""
Synthetic SKU data generator for the Restock Priority ML system.

Generates 50,000 synthetic SKU records with realistic distributions
for all 32 input features (8 primary variables + 24 external factors)
and computes deterministic Priority Scores as the training target.
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import (
    ALL_EXTERNAL,
    ALL_FEATURES,
    EXTERNAL_FACTORS,
    N_SYNTHETIC,
    PRIMARY_VARIABLES,
    RANDOM_SEED,
    SYNTHETIC_DIR,
)
from src.weights import WeightEngine

# ── Distribution configs for the 8 primary variables ─────────────────────────
PRIMARY_DISTRIBUTIONS = {
    "D":  {"dist": "lognormal", "mean": 50,  "sigma": 0.8,  "min": 1,   "max": 500},
    "S":  {"dist": "lognormal", "mean": 30,  "sigma": 0.7,  "min": 0,   "max": 180},
    "L":  {"dist": "normal",    "mean": 14,  "std": 5,      "min": 1,   "max": 60},
    "P":  {"dist": "normal",    "mean": 35,  "std": 15,     "min": 5,   "max": 80},
    "SC": {"dist": "lognormal", "mean": 500, "sigma": 1.0,  "min": 10,  "max": 10000},
    "HC": {"dist": "normal",    "mean": 100, "std": 40,     "min": 10,  "max": 500},
    "SR": {"dist": "beta",      "alpha": 2,  "beta": 8,     "min": 0,   "max": 1},
    "SE": {"dist": "normal",    "mean": 1.0, "std": 0.3,    "min": 0.2, "max": 3.0},
}

# Beta(alpha, beta) parameters for each of the 24 external factors (0-1 range)
EXTERNAL_BETA_PARAMS = {
    "MV":   (2.0, 5.0),  "CCR":  (3.0, 4.0),  "DFE":  (2.5, 5.0),
    "WU":   (2.0, 3.0),  "CFP":  (3.0, 5.0),  "ITR":  (2.0, 6.0),
    "SCDI": (2.5, 4.0),  "IDR":  (2.0, 5.0),  "GRI":  (3.0, 6.0),
    "CPP":  (4.0, 3.0),  "PED":  (2.5, 4.5),  "IBG":  (2.0, 7.0),
    "MCI":  (3.0, 5.0),  "CSC":  (5.0, 3.0),  "BLI":  (4.0, 4.0),
    "IR":   (2.0, 4.0),  "SCI":  (3.0, 5.0),  "PPR":  (2.5, 3.5),
    "SCR":  (2.0, 5.0),  "GSCV": (2.5, 6.0),  "SFH":  (5.0, 2.0),
    "SDCV": (3.0, 4.0),  "ISI":  (2.0, 5.0),  "CEI":  (2.5, 4.5),
}

CATEGORIES = [
    "Electronics", "Clothing", "Food & Beverage", "Home & Garden",
    "Health & Beauty", "Sports & Outdoors", "Toys & Games",
    "Automotive", "Office Supplies", "Pet Supplies",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_primary(rng: np.random.Generator, name: str, n: int) -> np.ndarray:
    """Sample *n* values for a primary variable from its configured distribution."""
    cfg = PRIMARY_DISTRIBUTIONS[name]
    lo, hi = cfg["min"], cfg["max"]

    if cfg["dist"] == "lognormal":
        mu = np.log(cfg["mean"]) - (cfg["sigma"] ** 2) / 2
        values = rng.lognormal(mean=mu, sigma=cfg["sigma"], size=n)
    elif cfg["dist"] == "normal":
        values = rng.normal(loc=cfg["mean"], scale=cfg["std"], size=n)
    elif cfg["dist"] == "beta":
        values = rng.beta(a=cfg["alpha"], b=cfg["beta"], size=n)
    else:
        raise ValueError(f"Unknown distribution: {cfg['dist']}")

    return np.clip(values, lo, hi)


def _minmax(arr: np.ndarray) -> np.ndarray:
    """Standard min-max normalization to [0, 1]."""
    lo, hi = arr.min(), arr.max()
    return (arr - lo) / (hi - lo) if hi > lo else np.zeros_like(arr)


# ── Core generation functions ─────────────────────────────────────────────────

def generate_raw_data(n: int = N_SYNTHETIC, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """Generate *n* synthetic SKU records with raw feature values and metadata."""
    rng = np.random.default_rng(seed)
    data: dict = {}

    # Metadata
    data["SKU_ID"] = [f"SKU-{i + 1:05d}" for i in range(n)]

    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)
    random_days = rng.integers(0, 730, size=n)
    data["timestamp"] = [
        (start_date + timedelta(days=int(d))).strftime("%Y-%m-%d")
        for d in random_days
    ]

    data["category"] = rng.choice(CATEGORIES, size=n).tolist()
    data["supplier_id"] = [f"SUP-{sid:04d}" for sid in rng.integers(1, 201, size=n)]

    # 8 primary variables
    for var in PRIMARY_VARIABLES:
        data[var] = _generate_primary(rng, var, n)

    # 24 external factors (beta distributions, already 0-1)
    for factor in ALL_EXTERNAL:
        a, b = EXTERNAL_BETA_PARAMS[factor]
        data[factor] = rng.beta(a=a, b=b, size=n)

    return pd.DataFrame(data)


def normalize_primary(df: pd.DataFrame) -> pd.DataFrame:
    """Min-max normalize the 8 primary variables.

    Standard scaling for all columns; inversion for S and HC is applied
    inside the scoring formula (consistent with ``src.scoring``).
    """
    norm = pd.DataFrame(index=df.index)
    for var in PRIMARY_VARIABLES:
        norm[var] = _minmax(df[var].values)
    return norm


def compute_priority_scores(
    primary_norm: pd.DataFrame,
    external_df: pd.DataFrame,
    seed: int = RANDOM_SEED,
) -> np.ndarray:
    """Compute deterministic Priority Scores using vectorized weight formulas.

    Steps
    -----
    1. Compute raw weights w1–w8 from the 24 external factors (vectorized).
    2. Normalize weights so they sum to 1.0 per row.
    3. Apply:  PS = w1·D_n + w2·(1−S_n) + w3·L_n + w4·P_n
                  + w5·SC_n + w6·(1−HC_n) + w7·SR_n + w8·SE_n
    4. Add small Gaussian noise and clip to [0, 1].
    """
    rng = np.random.default_rng(seed)
    n = len(primary_norm)

    # ── Vectorized weight computation (mirrors WeightEngine._compute_raw) ──
    w1_raw = (external_df["MV"] + external_df["CCR"] + external_df["DFE"]) / 3.0
    w2_raw = (
        0.4 * external_df["WU"]
        + 0.3 * external_df["CFP"]
        + 0.3 * (1.0 / np.maximum(external_df["ITR"].values, 0.001))
    )
    w3_raw = (external_df["SCDI"] + external_df["IDR"] + external_df["GRI"]) / 3.0
    w4_raw = 0.4 * external_df["CPP"] + 0.3 * external_df["PED"] + 0.3 * external_df["IBG"]
    w5_raw = (
        external_df["MCI"] + (1.0 - external_df["CSC"]) + (1.0 - external_df["BLI"])
    ) / 3.0
    w6_raw = 0.3 * external_df["IR"] + 0.3 * external_df["SCI"] + 0.4 * external_df["PPR"]
    w7_raw = (
        external_df["SCR"] + external_df["GSCV"] + (1.0 - external_df["SFH"])
    ) / 3.0
    w8_raw = 0.4 * external_df["SDCV"] + 0.3 * external_df["ISI"] + 0.3 * external_df["CEI"]

    raw_w = np.column_stack([
        w1_raw, w2_raw, w3_raw, w4_raw, w5_raw, w6_raw, w7_raw, w8_raw,
    ])
    totals = raw_w.sum(axis=1, keepdims=True)
    totals = np.where(totals > 0, totals, 1.0)
    weights = raw_w / totals  # (n, 8), each row sums to 1.0

    # ── Validate against WeightEngine on first row ──
    engine = WeightEngine()
    sample_ext = external_df.iloc[0].to_dict()
    ref_weights = engine.compute_weights(sample_ext)
    for i, k in enumerate([f"w{j}" for j in range(1, 9)]):
        assert abs(weights[0, i] - ref_weights[k]) < 1e-6, (
            f"Weight mismatch for {k}: vectorized={weights[0, i]:.6f} vs "
            f"engine={ref_weights[k]:.6f}"
        )

    # ── Variable values with inversions for S and HC ──
    var_vals = np.column_stack([
        primary_norm["D"].values,
        1.0 - primary_norm["S"].values,
        primary_norm["L"].values,
        primary_norm["P"].values,
        primary_norm["SC"].values,
        1.0 - primary_norm["HC"].values,
        primary_norm["SR"].values,
        primary_norm["SE"].values,
    ])

    # Weighted sum per row
    scores = np.sum(weights * var_vals, axis=1)

    # Small noise for realism
    noise = rng.normal(0, 0.02, size=n)
    return np.clip(scores + noise, 0.0, 1.0)


# ── Main entry point ─────────────────────────────────────────────────────────

def generate_and_save(n: int = N_SYNTHETIC, seed: int = RANDOM_SEED) -> None:
    """Generate synthetic data, compute targets, and save to CSV."""
    print(f"Generating {n:,} synthetic SKU records (seed={seed}) ...")

    # 1. Raw data
    raw_df = generate_raw_data(n, seed)
    print(f"  Raw data shape: {raw_df.shape}")

    # 2. Normalize the 8 primary variables
    primary_norm = normalize_primary(raw_df[PRIMARY_VARIABLES])

    # 3. External factors (already 0-1)
    external_df = raw_df[ALL_EXTERNAL]

    # 4. Compute priority scores
    print("  Computing priority scores ...")
    scores = compute_priority_scores(primary_norm, external_df, seed)
    raw_df["priority_score"] = scores

    # 5. Save full dataset (metadata + raw features + target)
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
    full_path = SYNTHETIC_DIR / "synthetic_sku_data.csv"
    raw_df.to_csv(full_path, index=False)
    print(f"  Saved full dataset → {full_path}")

    # 6. Training data (32 normalized features + target)
    training_df = pd.concat(
        [primary_norm, external_df.reset_index(drop=True)], axis=1
    )
    training_df["priority_score"] = scores
    train_path = SYNTHETIC_DIR / "training_data.csv"
    training_df.to_csv(train_path, index=False)
    print(f"  Saved training data → {train_path}")

    # 7. Summary statistics
    print(f"\n{'=' * 60}")
    print("Summary Statistics")
    print(f"{'=' * 60}")
    print(f"  Total records : {n:,}")
    print(f"  Features      : {len(ALL_FEATURES)} (8 primary + 24 external)")
    print(f"  Target range  : [{scores.min():.4f}, {scores.max():.4f}]")
    print(f"  Target mean   : {scores.mean():.4f}")
    print(f"  Target std    : {scores.std():.4f}")

    print("\nPriority Tier Distribution:")
    tier_bounds = [
        ("CRITICAL", 0.75, 1.01),
        ("HIGH",     0.50, 0.75),
        ("MEDIUM",   0.25, 0.50),
        ("LOW",      0.00, 0.25),
    ]
    for label, lo, hi in tier_bounds:
        count = int(np.sum((scores >= lo) & (scores < hi)))
        print(f"  {label:>8s}: {count:>6,} ({count / n * 100:5.1f}%)")

    print("\nPrimary Variable Ranges (raw):")
    for var in PRIMARY_VARIABLES:
        col = raw_df[var]
        print(
            f"  {var:>2s}: [{col.min():>10.2f}, {col.max():>10.2f}]  "
            f"mean={col.mean():.2f}  std={col.std():.2f}"
        )


if __name__ == "__main__":
    generate_and_save()
