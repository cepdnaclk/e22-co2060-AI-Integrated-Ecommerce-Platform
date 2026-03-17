"""
End-to-end integration test for the Restock Priority ML system.

Runs the full pipeline WITHOUT requiring heavy ML dependencies
(xgboost, lightgbm, torch, shap, optuna). Only needs numpy, pandas,
and scikit-learn.

Usage:
    python test_integration.py
"""

import sys
import traceback
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Project imports
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import ALL_FEATURES, PRIMARY_VARIABLES, ALL_EXTERNAL

from src.variables import VariableComputer
from src.external import ExternalFactorComputer
from src.weights import WeightEngine
from src.normalize import Normalizer
from src.scoring import PriorityScoreEngine


# ---------------------------------------------------------------------------
# Synthetic data generation (lightweight, no external generator needed)
# ---------------------------------------------------------------------------

def generate_synthetic_data(n: int = 100, seed: int = 42) -> pd.DataFrame:
    """Generate *n* synthetic SKU records with all 32 features."""
    rng = np.random.RandomState(seed)

    records = {}
    records["SKU_ID"] = [f"SKU-{i:04d}" for i in range(n)]

    # Primary variables (8)
    records["D"] = rng.uniform(1, 200, n)        # Demand rate
    records["S"] = rng.uniform(0, 500, n)         # Stock level
    records["L"] = rng.uniform(1, 30, n)          # Lead time
    records["P"] = rng.uniform(5, 60, n)          # Profit margin %
    records["SC"] = rng.uniform(0, 5000, n)       # Stockout cost
    records["HC"] = rng.uniform(0.5, 50, n)       # Holding cost
    records["SR"] = rng.uniform(0, 1, n)          # Supplier reliability
    records["SE"] = rng.uniform(0.5, 2.0, n)      # Seasonality index

    # External factors (24) — all in [0, 1]
    for col in ALL_EXTERNAL:
        records[col] = rng.uniform(0, 1, n)

    return pd.DataFrame(records)


# ---------------------------------------------------------------------------
# Test functions
# ---------------------------------------------------------------------------

def test_variables() -> None:
    """Test VariableComputer.compute_all with a representative SKU dict."""
    sku_data = {
        "total_units_sold": 500,
        "days": 30,
        "sales_history": [10, 15, 20, 18, 22, 25, 30],
        "units_on_hand": 120,
        "safety_stock": 20,
        "lead_time_history": [5.0, 7.0, 6.0, 8.0, 5.5],
        "selling_price": 50.0,
        "variable_cost": 20.0,
        "cogs": 25.0,
        "price": 50.0,
        "cost": 25.0,
        "q_lost": 10,
        "backorder_cost": 5.0,
        "q_backordered": 3,
        "goodwill_loss": 50.0,
        "unit_cost": 25.0,
        "holding_rate": 0.25,
        "avg_inventory": 100,
        "on_time_deliveries": 45,
        "total_orders": 50,
        "units_delivered": 950,
        "units_ordered": 1000,
        "quality_pass_rate": 0.95,
        "demand_by_period": {"Q1": 100, "Q2": 150, "Q3": 200, "Q4": 120},
    }

    vc = VariableComputer()
    result = vc.compute_all(sku_data)

    assert "demand_rate" in result, "Missing demand_rate"
    assert result["demand_rate"] > 0, "demand_rate should be positive"
    assert "days_of_supply" in result, "Missing days_of_supply"
    assert "contribution_margin" in result, "Missing contribution_margin"
    assert "stockout_cost" in result, "Missing stockout_cost"
    assert "holding_cost_per_unit" in result, "Missing holding_cost_per_unit"
    assert "supplier_reliability_score" in result, "Missing supplier_reliability_score"
    assert "seasonality_index" in result, "Missing seasonality_index"

    print("[PASS] test_variables — VariableComputer.compute_all produced all expected keys")


def test_external_factors() -> None:
    """Test ExternalFactorComputer.compute_all with representative data."""
    ext_data = {
        "price_series": [10.0, 11.5, 9.8, 12.0, 10.5],
        "churned_customers": 50,
        "total_customers": 1000,
        "actual_demand": 500,
        "forecast_demand": 480,
        "used_capacity": 8000,
        "total_capacity": 10000,
        "current_assets": 50000,
        "current_liabilities": 30000,
        "cogs": 120000,
        "avg_inventory": 40000,
        "lpi_score": 3.5,
        "imported_units": 300,
        "total_units": 1000,
        "gpr_index": 120,
        "competitor_price": 45.0,
        "your_price": 50.0,
        "pct_demand_change": -10.0,
        "pct_price_change": 5.0,
        "industry_margin": 0.30,
        "your_margin": 0.25,
        "hhi_score": 1500,
        "switching_ease_rate": 0.3,
        "nps_score": 60,
        "repeat_purchase_rate": 0.7,
        "central_bank_rate": 0.05,
        "current_storage_rate": 12.0,
        "benchmark_storage_rate": 10.0,
        "expired_units": 20,
        "total_held": 500,
        "top_supplier_units": 600,
        "total_supplier_units": 1000,
        "credit_score": 720,
        "demand_series": [100, 150, 200, 120, 180, 90, 160, 140, 110, 170, 130, 190],
        "seasonal_swing_pct": 0.35,
        "event_driven_revenue_pct": 0.15,
    }

    efc = ExternalFactorComputer()
    result = efc.compute_all(ext_data)

    assert len(result) == 24, f"Expected 24 external factors, got {len(result)}"

    for key in ALL_EXTERNAL:
        assert key in result, f"Missing external factor: {key}"
        val = result[key]
        assert isinstance(val, (int, float)), f"{key} is not numeric: {type(val)}"

    print("[PASS] test_external_factors — all 24 factors computed successfully")


def test_weights() -> None:
    """Test WeightEngine: compute weights and validate they sum to 1.0."""
    rng = np.random.RandomState(99)
    ext_factors = {col: rng.uniform(0.1, 0.9) for col in ALL_EXTERNAL}

    engine = WeightEngine()
    weights = engine.compute_weights(ext_factors)

    assert len(weights) == 8, f"Expected 8 weights, got {len(weights)}"
    for k in [f"w{i}" for i in range(1, 9)]:
        assert k in weights, f"Missing weight key: {k}"
        assert 0.0 <= weights[k] <= 1.0, f"{k}={weights[k]} out of [0,1]"

    weight_sum = sum(weights.values())
    assert abs(weight_sum - 1.0) < 1e-6, f"Weights sum to {weight_sum}, expected 1.0"

    assert engine.validate_weights(weights), "validate_weights returned False"

    report = engine.generate_weight_report(weights, ext_factors)
    assert "dominant_weight" in report, "Missing dominant_weight in report"

    print(f"[PASS] test_weights — weights sum={weight_sum:.6f}, dominant={report['dominant_weight']}")


def test_normalization() -> None:
    """Test Normalizer: fit, transform, inverse_transform round-trip."""
    rng = np.random.RandomState(7)
    n = 50
    raw_df = pd.DataFrame({col: rng.uniform(0, 100, n) for col in PRIMARY_VARIABLES})

    normalizer = Normalizer(stats_path=str(Path(__file__).resolve().parent / "data" / "processed" / "test_feature_stats.json"))
    norm_df = normalizer.fit_transform(raw_df)

    # All normalized values should be in [0, 1]
    for col in norm_df.columns:
        col_min = norm_df[col].min()
        col_max = norm_df[col].max()
        assert col_min >= -1e-9, f"{col} norm min={col_min} < 0"
        assert col_max <= 1.0 + 1e-9, f"{col} norm max={col_max} > 1"

    # Round-trip: inverse_transform should recover original values
    recovered_df = normalizer.inverse_transform(norm_df)
    for col in PRIMARY_VARIABLES:
        max_diff = float(np.abs(recovered_df[col] - raw_df[col]).max())
        assert max_diff < 1e-6, f"Round-trip error for {col}: max_diff={max_diff}"

    print("[PASS] test_normalization — fit/transform/inverse round-trip OK, all values in [0,1]")


def test_scoring_pipeline() -> None:
    """Test PriorityScoreEngine: single SKU and batch scoring."""
    df = generate_synthetic_data(n=100, seed=42)

    # Fit normalizer on primary variables
    normalizer = Normalizer(stats_path=str(Path(__file__).resolve().parent / "data" / "processed" / "test_scoring_stats.json"))
    normalizer.fit(df[PRIMARY_VARIABLES])

    # Build external factors (use row 0 as representative)
    ext_factors = df[ALL_EXTERNAL].iloc[0].to_dict()

    engine = PriorityScoreEngine()
    weight_engine = WeightEngine()

    # --- Single-SKU scoring ---
    sku_row = df.iloc[0].to_dict()
    single_result = engine.score_single_sku(sku_row, ext_factors, normalizer, weight_engine)

    assert "score" in single_result, "Missing 'score' in single result"
    assert "tier" in single_result, "Missing 'tier' in single result"
    assert 0.0 <= single_result["score"] <= 1.0, f"Score {single_result['score']} out of [0,1]"
    assert single_result["tier"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW"), \
        f"Unknown tier: {single_result['tier']}"

    print(f"  Single SKU: {single_result['sku_id']} → "
          f"score={single_result['score']:.4f}, tier={single_result['tier']}")

    # --- Batch scoring ---
    batch_df = engine.score_batch(df, ext_factors, normalizer, weight_engine)

    assert len(batch_df) == 100, f"Expected 100 rows, got {len(batch_df)}"
    assert "score" in batch_df.columns, "Missing 'score' column in batch output"
    assert "tier" in batch_df.columns, "Missing 'tier' column in batch output"

    # All scores in [0, 1]
    assert batch_df["score"].min() >= 0.0, f"Min score {batch_df['score'].min()} < 0"
    assert batch_df["score"].max() <= 1.0, f"Max score {batch_df['score'].max()} > 1"

    # Verify at least one CRITICAL tier item exists
    tier_counts = batch_df["tier"].value_counts().to_dict()
    critical_count = tier_counts.get("CRITICAL", 0)
    assert critical_count >= 1, \
        f"Expected at least 1 CRITICAL item, got {critical_count}. Tiers: {tier_counts}"

    # Detect critical SKUs
    critical_df = engine.detect_critical_skus(batch_df)
    assert len(critical_df) == critical_count, \
        f"detect_critical_skus returned {len(critical_df)}, expected {critical_count}"

    # --- Print ranked restock list (top 10) ---
    print("\n  ┌─────────────────────────────────────────────────────────┐")
    print("  │              TOP 10 RESTOCK PRIORITY LIST               │")
    print("  ├──────┬──────────┬────────┬──────────────────────────────┤")
    print("  │ Rank │ SKU_ID   │ Score  │ Tier                         │")
    print("  ├──────┼──────────┼────────┼──────────────────────────────┤")
    for i, row in batch_df.head(10).iterrows():
        print(f"  │ {i+1:>4} │ {row['SKU_ID']:<8} │ {row['score']:.4f} │ {row['tier']:<28} │")
    print("  └──────┴──────────┴────────┴──────────────────────────────┘")

    # --- Summary statistics ---
    print(f"\n  Summary Statistics:")
    print(f"    Total SKUs scored : {len(batch_df)}")
    print(f"    Score range       : [{batch_df['score'].min():.4f}, {batch_df['score'].max():.4f}]")
    print(f"    Mean score        : {batch_df['score'].mean():.4f}")
    print(f"    Std dev           : {batch_df['score'].std():.4f}")
    print(f"    Tier distribution :")
    for tier in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        count = tier_counts.get(tier, 0)
        print(f"      {tier:<10}: {count:>3} ({count/len(batch_df)*100:.1f}%)")

    print("\n[PASS] test_scoring_pipeline — single + batch scoring, tiers, and ranking OK")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_all_tests() -> None:
    """Execute all test functions and print a summary."""
    tests = [
        test_variables,
        test_external_factors,
        test_weights,
        test_normalization,
        test_scoring_pipeline,
    ]

    passed = 0
    failed = 0
    errors = []

    print("=" * 65)
    print("  RESTOCK PRIORITY ML — INTEGRATION TEST SUITE")
    print("=" * 65)
    print()

    for test_fn in tests:
        name = test_fn.__name__
        try:
            test_fn()
            passed += 1
        except Exception as exc:
            failed += 1
            errors.append((name, exc))
            print(f"[FAIL] {name} — {exc}")
            traceback.print_exc()
        print()

    # --- Final summary ---
    print("=" * 65)
    print(f"  RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 65)

    if errors:
        print("\nFailed tests:")
        for name, exc in errors:
            print(f"  ✗ {name}: {exc}")
        sys.exit(1)
    else:
        print("\n  ✓ All integration tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    run_all_tests()
