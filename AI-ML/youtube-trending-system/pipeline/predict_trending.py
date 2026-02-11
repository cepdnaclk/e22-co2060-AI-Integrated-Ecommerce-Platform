import pandas as pd
import os
from models.trend_model import score

FEATURES_FILE = "storage/features.csv"
OUTPUT_FILE = "output/trending_top3.json"

# Basic existence check
if not os.path.exists(FEATURES_FILE):
    print("⚠️ Features file not found. Waiting for more data.")
    exit(0)

# Safe read
try:
    df = pd.read_csv(FEATURES_FILE)
except pd.errors.EmptyDataError:
    print("⚠️ Features file exists but is empty. Waiting for more data.")
    exit(0)

# No rows case
if df.empty:
    print("⚠️ Not enough historical data to generate trends yet.")
    exit(0)

# Normal prediction
top3 = score(df).head(3)

os.makedirs("output", exist_ok=True)
top3.to_json(OUTPUT_FILE, orient="records")

print("🔥 Top-3 trending products generated successfully")
