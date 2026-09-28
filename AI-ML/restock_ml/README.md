# Restock Priority ML Model — Full Documentation

## 1. Overview

This ML system decides **which products to restock first** in an e-commerce warehouse. It gives every product (SKU) a **Priority Score from 0 to 1**. A score close to 1 means "restock urgently", and close to 0 means "no rush".

The system uses **32 input features** (8 core inventory variables + 24 external market factors) and a **3-model ensemble** (XGBoost + LightGBM + Neural Network) blended by a Ridge meta-learner.

---

## 2. Architecture

```
Input: 32 Features (8 primary variables + 24 external factors)
        │
        ▼
┌─────────────────────────────┐
│  Normalization (Min-Max)    │  ← Scale all values to [0, 1]
└───────────┬─────────────────┘
            │
   ┌────────┼──────────┐
   ▼        ▼          ▼
┌────────┐ ┌────────┐ ┌───────────────┐
│XGBoost │ │LightGBM│ │ MLP (PyTorch) │   ← 3 base models predict independently
│Regressor│ │Regressor│ │ Neural Network│
└───┬────┘ └───┬────┘ └──────┬────────┘
    └──────┬───┴─────────────┘
           ▼
   ┌───────────────────┐
   │ Ridge Meta-Learner │  ← Blends all 3 predictions into final score
   └───────┬───────────┘
           ▼
    Priority Score (0–1)
           │
           ▼
   ┌───────────────┐
   │ Priority Tier  │  ← CRITICAL / HIGH / MEDIUM / LOW
   └───────────────┘
```

---

## 3. The Master Equation (Deterministic Formula)

The core formula that computes the Priority Score for each SKU is:

```
PS = w1·D_n + w2·(1 − S_n) + w3·L_n + w4·P_n + w5·SC_n + w6·(1 − HC_n) + w7·SR_n + w8·SE_n
```

Where:
- `PS` = Priority Score (0 to 1)
- `w1` to `w8` = Dynamic weights (sum to 1.0), computed from 24 external factors
- `D_n, S_n, L_n, P_n, SC_n, HC_n, SR_n, SE_n` = Normalized values (0 to 1) of the 8 primary variables

**Why are S and HC inverted (1 − value)?**
- **Stock Level (S)**: More stock = less urgency, so we flip it
- **Holding Cost (HC)**: Higher holding cost = we already have too much, so less urgency to add more

---

## 4. The 8 Primary Variables

These are the core inventory metrics for each product:

| # | Symbol | Name | Formula | What It Means |
|---|--------|------|---------|---------------|
| 1 | **D** | Demand Rate | `D = Total_Units_Sold / Days` | How fast the product is selling (units/day) |
| 2 | **S** | Stock Level | `Days_of_Supply = Units_on_Hand / Demand_Rate` | How many days of stock remain |
| 3 | **L** | Lead Time | `L_adj = L_avg + (z × σ_L)` | How long it takes the supplier to deliver (days), adjusted for uncertainty |
| 4 | **P** | Profit Margin | `P = (Selling_Price − Variable_Cost) / Selling_Price × 100` | How profitable the product is (%) |
| 5 | **SC** | Stockout Cost | `SC = (Price−Cost)×Q_lost + Backorder_Cost×Q_backordered + Goodwill_Loss` | Total cost if we run out of stock |
| 6 | **HC** | Holding Cost | `HC = Unit_Cost × Holding_Rate` | Cost of keeping one unit in the warehouse per year |
| 7 | **SR** | Supplier Reliability | `SR = 0.4×OTD + 0.4×Fill_Rate + 0.2×Quality_Rate` | How reliable the supplier is (0-1). Lower = riskier |
| 8 | **SE** | Seasonality Index | `SE_t = D_avg_t / Overall_Avg_Demand` | How much demand varies by season. >1 = peak season |

### Variable Details

**Demand Rate (D):**
```
D = Total_Units_Sold / Number_of_Days
Weighted Moving Average (optional) = Σ(weight_i × sales_i) / Σ(weights)
```
Higher D → product is selling fast → restock sooner.

**Stock Level (S):**
```
Days_of_Supply = Units_on_Hand / Demand_Rate
Reorder_Point = (Demand_Rate × Lead_Time) + Safety_Stock
```
Low stock + high demand → urgent restock.

**Lead Time (L):**
```
L_avg = mean(historical lead times)
σ_L = std(historical lead times)
L_adjusted = L_avg + (1.65 × σ_L)     ← 95% confidence
```
Longer/unpredictable lead time → order earlier.

**Profit Margin (P):**
```
Contribution_Margin = (SP - VC) / SP × 100
Gross_Margin = (SP - COGS) / SP × 100
```
Higher margin products → prioritize restocking.

**Stockout Cost (SC):**
```
SC = (Price - Cost) × Quantity_Lost + Backorder_Cost × Quantity_Backordered + Goodwill_Loss
```
High stockout cost → very costly to run out → restock urgently.

**Holding Cost (HC):**
```
HC_per_unit = Unit_Cost × Holding_Rate (default 25%)
HC_total = Average_Inventory × Unit_Cost × Holding_Rate
```
High holding cost → expensive to store → less urgency to add more.

**Supplier Reliability (SR):**
```
OTD = On_Time_Deliveries / Total_Orders
Fill_Rate = Units_Delivered / Units_Ordered
SR_score = 0.4×OTD + 0.4×Fill_Rate + 0.2×Quality_Pass_Rate
SR_failure = 1 - SR_score
```
Unreliable supplier → order earlier as buffer.

**Seasonality Index (SE):**
```
SE_t = Average_Demand_in_Period_t / Overall_Average_Demand
```
SE > 1 means peak season → stock up. SE < 1 means off-season.

---

## 5. The 24 External Factors

These are market/business conditions that **dynamically adjust the weights** (w1–w8). All values are normalized to [0, 1].

### Group 1 → Affects w1 (Demand Rate weight)

| Abbr | Name | Formula |
|------|------|---------|
| **MV** | Market Volatility | `std(prices) / mean(prices)` — Price instability |
| **CCR** | Customer Churn Rate | `Churned_Customers / Total_Customers` |
| **DFE** | Demand Forecast Error | `\|Actual − Forecast\| / Actual` |

### Group 2 → Affects w2 (Stock Level weight)

| Abbr | Name | Formula |
|------|------|---------|
| **WU** | Warehouse Utilization | `Used_Capacity / Total_Capacity` |
| **CFP** | Cash Flow Pressure | `1 − min(Current_Assets / Current_Liabilities, 1)` |
| **ITR** | Inventory Turnover Ratio | `COGS / Average_Inventory` |

### Group 3 → Affects w3 (Lead Time weight)

| Abbr | Name | Formula |
|------|------|---------|
| **SCDI** | Supply Chain Disruption Index | `1 − (LPI_Score / 5)` |
| **IDR** | Import Dependency Ratio | `Imported_Units / Total_Units` |
| **GRI** | Geopolitical Risk Index | `min(GPR_Index / 200, 1)` |

### Group 4 → Affects w4 (Profit Margin weight)

| Abbr | Name | Formula |
|------|------|---------|
| **CPP** | Competitive Price Pressure | `max(0, (Competitor_Price − Your_Price) / Your_Price)` |
| **PED** | Price Elasticity of Demand | `\|%ΔDemand / %ΔPrice\|` |
| **IBG** | Industry Benchmark Gap | `max(0, (Industry_Margin − Your_Margin) / Industry_Margin)` |

### Group 5 → Affects w5 (Stockout Cost weight)

| Abbr | Name | Formula |
|------|------|---------|
| **MCI** | Market Competition Index | `1 − (HHI / 10000)` |
| **CSC** | Customer Switching Cost | `1 − Switching_Ease_Rate` |
| **BLI** | Brand Loyalty Index | `((NPS+100)/200 + Repeat_Purchase_Rate) / 2` |

### Group 6 → Affects w6 (Holding Cost weight)

| Abbr | Name | Formula |
|------|------|---------|
| **IR** | Interest Rate Factor | `min(Central_Bank_Rate / 0.20, 1)` |
| **SCI** | Storage Cost Index | `min(Current_Rate / Benchmark_Rate, 1)` |
| **PPR** | Product Perishability Rate | `Expired_Units / Total_Held` |

### Group 7 → Affects w7 (Supplier Reliability weight)

| Abbr | Name | Formula |
|------|------|---------|
| **SCR** | Supplier Concentration Ratio | `Top_Supplier_Units / Total_Units` |
| **GSCV** | Global Supply Chain Volatility | `1 − (LPI / 5)` |
| **SFH** | Supplier Financial Health | `min(Credit_Score / 850, 1)` |

### Group 8 → Affects w8 (Seasonality weight)

| Abbr | Name | Formula |
|------|------|---------|
| **SDCV** | Seasonal Demand CV | `std(demand) / mean(demand)` |
| **ISI** | Industry Seasonality Index | `min(Seasonal_Swing% / 100, 1)` |
| **CEI** | Climate Event Impact | `Event_Driven_Revenue_Percentage` (0-1) |

---

## 6. Weight Computation Equations

The 24 external factors are grouped into 8 weight formulas:

```
w1_raw = (MV + CCR + DFE) / 3
w2_raw = 0.4×WU + 0.3×CFP + 0.3×(1 / max(ITR, 0.001))
w3_raw = (SCDI + IDR + GRI) / 3
w4_raw = 0.4×CPP + 0.3×PED + 0.3×IBG
w5_raw = (MCI + (1−CSC) + (1−BLI)) / 3
w6_raw = 0.3×IR + 0.3×SCI + 0.4×PPR
w7_raw = (SCR + GSCV + (1−SFH)) / 3
w8_raw = 0.4×SDCV + 0.3×ISI + 0.3×CEI
```

**Normalization** (so they sum to 1.0):
```
w_i = w_i_raw / (w1_raw + w2_raw + ... + w8_raw)
```

**Fallback weights** (used when external data is unavailable):
```
w1=0.25, w2=0.20, w3=0.15, w4=0.10, w5=0.10, w6=0.08, w7=0.07, w8=0.05
```

---

## 7. Normalization

All features are scaled to [0, 1] using **Min-Max Normalization**:

```
Standard:  X_normalized = (X − X_min) / (X_max − X_min)
Inverted:  X_normalized = 1 − (X − X_min) / (X_max − X_min)
```

**Inverted columns**: `S` (Stock Level) and `HC` (Holding Cost) — because lower raw values mean higher restock urgency.

---

## 8. ML Ensemble Architecture

The ML model **learns** the priority score pattern from data instead of relying only on the deterministic formula.

### Stage 1A: XGBoost Regressor
- Gradient-boosted decision trees
- Hyperparameters tuned with **Optuna** (50 trials)
- Search space: n_estimators [100–1000], max_depth [3–8], learning_rate [0.01–0.3], subsample [0.6–1.0]

### Stage 1B: LightGBM Regressor
- Faster gradient boosting with leaf-wise growth
- Hyperparameters tuned with **Optuna** (50 trials)
- Search space: num_leaves [20–200], min_data_in_leaf [10–100], feature_fraction [0.6–1.0], learning_rate [0.01–0.3]

### Stage 2: MLP Neural Network (PyTorch)
```
Input(32) → Linear(128) → ReLU → Dropout(0.3)
          → Linear(64)  → ReLU → Dropout(0.2)
          → Linear(1)   → Sigmoid
```
- Trained with Adam optimizer (lr=0.001)
- Early stopping (patience=10 epochs) on validation MSE
- Max 200 epochs, batch size 256

### Stage 3: Ridge Meta-Learner
```
Final_Score = Ridge(XGB_prediction, LGBM_prediction, MLP_prediction)
```
- Takes the 3 base model predictions as input
- Learns optimal blending weights via Ridge Regression (alpha=1.0)
- Trained on **Out-of-Fold (OOF)** predictions using 5-fold TimeSeriesSplit
- Output clipped to [0, 1]

---

## 9. Training Data

### Synthetic Data Generation
The system generates **50,000 synthetic SKU records** with realistic distributions:

| Variable | Distribution | Range |
|----------|-------------|-------|
| D (Demand) | Log-normal | 1 – 500 |
| S (Stock) | Log-normal | 0 – 180 |
| L (Lead Time) | Normal(14, 5) | 1 – 60 days |
| P (Profit Margin) | Normal(35, 15) | 5 – 80% |
| SC (Stockout Cost) | Log-normal | 10 – 10,000 |
| HC (Holding Cost) | Normal(100, 40) | 10 – 500 |
| SR (Supplier Reliability) | Beta(2, 8) | 0 – 1 |
| SE (Seasonality) | Normal(1.0, 0.3) | 0.2 – 3.0 |
| 24 External Factors | Beta distributions | 0 – 1 |

### Data Split
```
Total: 50,000 records
├── Training:   70% (35,000 records)
├── Validation: 15% (7,500 records)  ← for early stopping & tuning
└── Test:       15% (7,500 records)  ← for final evaluation
```

### Target Variable
The **priority_score** (0–1) is computed using the deterministic master formula + small Gaussian noise (σ=0.02) for realism.

### Generated Files
- `data/synthetic/synthetic_sku_data.csv` — Full dataset with metadata (SKU_ID, timestamp, category, supplier_id) + raw features + target
- `data/synthetic/training_data.csv` — 32 normalized features + target (used for model training)

---

## 10. Evaluation Metrics

The model is evaluated against these acceptance thresholds:

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| **MAE** | < 0.05 | Average prediction error must be under 5% |
| **RMSE** | < 0.08 | Root mean squared error under 8% |
| **R²** | > 0.90 | Model explains >90% of score variance |
| **MAPE** | < 7% | Mean absolute percentage error under 7% |
| **Precision@Top10%** | > 0.85 | 85%+ of items predicted as critical are truly critical |
| **Recall@Top10%** | > 0.90 | 90%+ of truly critical items are detected |

### Drift Detection
The system detects model degradation over time:
- **RMSE drift** alert if RMSE increases by > 0.03
- **R² drift** alert if R² drops by > 0.05

---

## 11. Priority Tiers

The final score maps to an action tier:

| Tier | Score Range | Action | Response Time |
|------|-------------|--------|---------------|
| **CRITICAL** | 0.75 – 1.00 | Restock immediately | 24 hours |
| **HIGH** | 0.50 – 0.74 | Place priority order | 3 days |
| **MEDIUM** | 0.25 – 0.49 | Schedule restock | 1 week |
| **LOW** | 0.00 – 0.24 | Monitor only | Monthly |

---

## 12. Project Structure

```
restock_ml/
├── main.py                     # CLI entry point (train / score / evaluate)
├── synthetic_data_generator.py # Generate 50K synthetic training records
├── test_integration.py         # End-to-end integration tests
├── config.py                   # All hyperparameters & settings
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker containerization
├── src/
│   ├── api.py                  # FastAPI service (8 endpoints)
│   ├── ensemble.py             # 3-stage ensemble prediction logic
│   ├── train.py                # XGBoost + LightGBM + MLP + Ridge training
│   ├── scoring.py              # Deterministic priority scoring engine
│   ├── evaluate.py             # Metrics, reports, drift detection
│   ├── explain.py              # SHAP feature importance explanations
│   ├── external.py             # 24 external factor computations
│   ├── normalize.py            # Min-Max normalization + preprocessing
│   ├── variables.py            # 8 core variable computations
│   └── weights.py              # Dynamic weight engine + AHP validation
├── data/
│   ├── raw/                    # Raw input data
│   ├── processed/              # Feature statistics (JSON)
│   └── synthetic/              # Generated training data (CSV)
├── models/                     # Saved model files (.joblib, .pt)
├── reports/                    # HTML evaluation reports
└── logs/                       # Runtime logs
```

---

## 13. How to Run

```bash
cd AI-ML/restock_ml
pip install -r requirements.txt

# Step 1: Generate training data
python synthetic_data_generator.py

# Step 2: Train the models
python main.py --mode train

# Step 3: Score all SKUs (outputs ranked restock order)
python main.py --mode score

# Step 4: Evaluate model performance
python main.py --mode evaluate

# Optional: Start the API server
python -m uvicorn src.api:app --host 0.0.0.0 --port 8001
```

### View Restock Order
```bash
python -c "import sqlite3, pandas as pd; conn = sqlite3.connect('restock.db'); df = pd.read_sql('SELECT SKU_ID, final_score, rank, priority_tier FROM scoring_results ORDER BY rank ASC LIMIT 20', conn); print(df.to_string(index=False)); conn.close()"
```

### Export to CSV
```bash
python -c "import sqlite3, pandas as pd; conn = sqlite3.connect('restock.db'); df = pd.read_sql('SELECT SKU_ID, final_score, rank, priority_tier FROM scoring_results ORDER BY rank ASC', conn); df.to_csv('restock_order.csv', index=False); print(f'Saved {len(df)} SKUs'); conn.close()"
```

---

## 14. API Endpoints

Base URL: `http://localhost:8001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/score/single` | Score a single SKU |
| POST | `/score/batch` | Score multiple SKUs (returns ranked list) |
| GET | `/score/critical` | Get only CRITICAL tier items |
| GET | `/weights/current` | Current w1–w8 weights + external factors |
| POST | `/weights/recalculate` | Recalculate weights from new external factors |
| GET | `/explain/{sku_id}` | SHAP-based feature importance for a SKU |
| POST | `/feedback/{sku_id}` | Store actual restock outcome for retraining |

---

## 15. Integration

Connected to the Node.js backend via `/api/admin/restock/*` routes defined in `Backend/backend-inter/router/restockRouter.js`. All routes require admin/CEO role authorization. The backend bridges MongoDB inventory data to this ML microservice.

---

## 16. End-to-End Flow Summary

```
1. Raw SKU data (inventory levels, sales, costs, supplier info)
           ↓
2. Compute 8 primary variables (D, S, L, P, SC, HC, SR, SE)
           ↓
3. Normalize to [0, 1] using Min-Max scaling
           ↓
4. Collect 24 external market factors
           ↓
5. Compute dynamic weights w1–w8 from external factors
           ↓
6. Feed all 32 features into the 3-model ensemble
           ↓
7. Ridge meta-learner blends predictions → Priority Score (0–1)
           ↓
8. Map score to tier: CRITICAL / HIGH / MEDIUM / LOW
           ↓
9. Rank all SKUs by score → Final Restock Order
           ↓
10. Store results in SQLite database + alert CRITICAL items
```

---

## 17. Testing

```bash
python test_integration.py
```
