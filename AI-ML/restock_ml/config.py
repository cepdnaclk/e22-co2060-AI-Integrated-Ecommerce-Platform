"""
Central configuration and constants for the Restock Priority ML System.
"""

import os
from pathlib import Path

# ── Project Paths ──
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
SYNTHETIC_DIR = DATA_DIR / "synthetic"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
LOGS_DIR = BASE_DIR / "logs"
SRC_DIR = BASE_DIR / "src"

for d in [RAW_DIR, PROCESSED_DIR, SYNTHETIC_DIR, MODELS_DIR, REPORTS_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ── Feature Names ──
PRIMARY_VARIABLES = ["D", "S", "L", "P", "SC", "HC", "SR", "SE"]

EXTERNAL_FACTORS = {
    "w1": ["MV", "CCR", "DFE"],
    "w2": ["WU", "CFP", "ITR"],
    "w3": ["SCDI", "IDR", "GRI"],
    "w4": ["CPP", "PED", "IBG"],
    "w5": ["MCI", "CSC", "BLI"],
    "w6": ["IR", "SCI", "PPR"],
    "w7": ["SCR", "GSCV", "SFH"],
    "w8": ["SDCV", "ISI", "CEI"],
}

ALL_EXTERNAL = [f for group in EXTERNAL_FACTORS.values() for f in group]
ALL_FEATURES = PRIMARY_VARIABLES + ALL_EXTERNAL  # 32 total
METADATA_COLUMNS = ["SKU_ID", "timestamp", "category", "supplier_id"]

# ── Normalization ──
INVERTED_COLUMNS = ["S", "HC"]
STANDARD_COLUMNS = [c for c in PRIMARY_VARIABLES if c not in INVERTED_COLUMNS]

# ── Priority Tiers ──
PRIORITY_TIERS = {
    "CRITICAL": {"min": 0.75, "max": 1.00, "action": "Restock immediately", "response": "24 hours"},
    "HIGH":     {"min": 0.50, "max": 0.74, "action": "Place priority order", "response": "3 days"},
    "MEDIUM":   {"min": 0.25, "max": 0.49, "action": "Schedule restock", "response": "1 week"},
    "LOW":      {"min": 0.00, "max": 0.24, "action": "Monitor only", "response": "Monthly"},
}

# ── Fallback Weights ──
FALLBACK_WEIGHTS = {
    "w1": 0.25, "w2": 0.20, "w3": 0.15, "w4": 0.10,
    "w5": 0.10, "w6": 0.08, "w7": 0.07, "w8": 0.05,
}

# ── ML Training ──
RANDOM_SEED = 42
TEST_SIZE = 0.15
VAL_SIZE = 0.15
N_SYNTHETIC = 50000
OPTUNA_TRIALS = 50

# ── Evaluation Thresholds ──
EVAL_THRESHOLDS = {
    "MAE": 0.05,
    "RMSE": 0.08,
    "R2": 0.90,
    "MAPE": 7.0,
    "Precision@Top10": 0.85,
    "Recall@Top10": 0.90,
}

# ── API Config ──
API_HOST = os.getenv("RESTOCK_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("RESTOCK_API_PORT", "8001"))
RATE_LIMIT = 100  # requests per minute

# ── Database ──
SQLITE_DB = str(BASE_DIR / "restock.db")

# ── AHP ──
AHP_RI_TABLE = {1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41}
