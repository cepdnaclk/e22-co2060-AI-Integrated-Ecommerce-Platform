# Restock Priority ML Model

ML system that computes priority scores (0–1) for inventory restocking using **8 core variables** and **24 external factors**. A 3-stage ensemble (XGBoost + LightGBM + MLP) with a Ridge meta-learner produces calibrated scores that map to actionable priority tiers.

## Architecture

```
Input (8 variables + 24 external factors)
        │
        ▼
┌───────────────────────┐
│  Feature Engineering  │
│  & Normalization      │
└───────┬───────────────┘
        │
   ┌────┴─────┬──────────┐
   ▼          ▼          ▼
┌──────┐ ┌────────┐ ┌─────┐
│XGBoost│ │LightGBM│ │ MLP │
└──┬───┘ └───┬────┘ └──┬──┘
   └────┬─────┴─────────┘
        ▼
┌───────────────────┐
│  Ridge Meta-Learner│
└───────┬───────────┘
        ▼
  Priority Score (0–1)
```

## Project Structure

```
restock_ml/
├── main.py                     # CLI entry point (train / score)
├── synthetic_data_generator.py # Generate synthetic training data
├── test_integration.py         # End-to-end integration tests
├── config.py                   # Hyperparameters & settings
├── requirements.txt            # Python dependencies
├── Dockerfile
├── src/
│   ├── api.py                  # FastAPI service (8 endpoints)
│   ├── ensemble.py             # 3-stage ensemble logic
│   ├── train.py                # Model training pipeline
│   ├── scoring.py              # Inference & batch scoring
│   ├── evaluate.py             # Metrics & evaluation
│   ├── explain.py              # SHAP explanations
│   ├── external.py             # 24 external factor ingestion
│   ├── normalize.py            # Feature normalization
│   ├── variables.py            # 8 core variable definitions
│   └── weights.py              # Weight calculation & recalculation
├── data/
│   ├── raw/
│   ├── processed/
│   └── synthetic/
├── models/                     # Saved model artifacts
├── reports/                    # Evaluation reports
└── logs/
```

## Quick Start

```bash
cd AI-ML/restock_ml
pip install -r requirements.txt

# Generate training data
python synthetic_data_generator.py

# Train models
python main.py --mode train

# Run scoring
python main.py --mode score

# Start API server
python -m uvicorn src.api:app --host 0.0.0.0 --port 8001
```

## API Endpoints

| Method | Endpoint               | Description                                  |
|--------|------------------------|----------------------------------------------|
| GET    | `/health`              | Service health, model version, scoring mode  |
| POST   | `/score/single`        | Score a single SKU                           |
| POST   | `/score/batch`         | Score a batch of SKUs (ranked by priority)   |
| GET    | `/score/critical`      | Get items above critical threshold           |
| GET    | `/weights/current`     | Current 8 weights + external factors         |
| POST   | `/weights/recalculate` | Recalculate weights from external factors    |
| GET    | `/explain/{sku_id}`    | SHAP transparency report for a SKU          |
| POST   | `/feedback/{sku_id}`   | Store actual restock outcome for retraining  |

## Priority Tiers

| Tier     | Score Range | Action                        |
|----------|-------------|-------------------------------|
| CRITICAL | 0.85 – 1.00 | Immediate restock required   |
| HIGH     | 0.65 – 0.84 | Restock within 24–48 hours   |
| MEDIUM   | 0.40 – 0.64 | Schedule restock this week   |
| LOW      | 0.00 – 0.39 | Monitor, no action needed    |

## Integration

Connected to the Node.js backend via `/api/admin/restock/*` routes defined in `Backend/backend-inter/router/restockRouter.js`. All routes require admin/CEO role authorization. The backend bridges MongoDB inventory data to this ML microservice.

## Testing

```bash
python test_integration.py
```
