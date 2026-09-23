# Complete Training System Usage Guide

## Quick Start

### 1. Setup Environment

```bash
cd Backend/rag-learning-system/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements-finetune.txt
```

### 2. Configure .env

```bash
cat > .env.training << EOF
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=rag_learning
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
BASE_MODEL=meta-llama/Llama-2-7b
NUM_EPOCHS=3
BATCH_SIZE=8
LEARNING_RATE=0.0001
DEVICE=cuda
EOF
```

### 3. Ensure Ollama is Running

```bash
ollama serve
# In another terminal:
ollama pull llama3.2:1b
```

### 4. Run One-Time Training Pipeline

```bash
python training/training_orchestrator.py
```

Expected output:
```
============================================================
STEP 1: Export Approved Q/A
============================================================
Exported data to: models/approved_data_2024-01-15T...jsonl

============================================================
STEP 2: Split Dataset
============================================================
Data split complete: train=70%, val=15%, test=15%

============================================================
STEP 3: Train Model (LoRA)
============================================================
Training complete. Model saved to: models/v20240115_143022/

[... training logs ...]

============================================================
STEP 4: Evaluate Model
============================================================
Evaluation metrics: {
  "exact_match": 0.82,
  "token_f1": 0.88,
  "bleu": 0.75,
  ...
}

============================================================
STEP 5: Compare with Baseline
============================================================
Comparison result: winner=candidate (improvements: 3, regressions: 0)

============================================================
STEP 6: A/B Test (10% canary)
============================================================
A/B test started. Running for 24 hours...

============================================================
STEP 7: Deploy (PROMOTE)
============================================================
Promoted version v20240115_143022 to production
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   Approved Q/A in MongoDB                    │
│        (admin-approved chat exchanges)                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│        DATA PIPELINE: Export → Split → Prepare               │
├──────────────────────────────────────────────────────────────┤
│ • export_approved_data.py: MongoDB → JSONL (raw + SFT)      │
│ • split_dataset.py: 70% train, 15% val, 15% test            │
│ • Data format: {"messages": [{"role": "...", "content": ""}]}│
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│     TRAINING PIPELINE: Train → Evaluate → Compare            │
├──────────────────────────────────────────────────────────────┤
│ • train_lora.py: LoRA adapter on base model                  │
│ • merge_lora.py: Merge adapter into base                     │
│ • metrics_calculator.py: BLEU, F1, exact match               │
│ • model_registry.py: Version tracking                        │
└──────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────┴────────────────┐
            ↓                                ↓
    [Baseline Metrics]          [New Model Metrics]
         (v0.1.0)                    (v0.1.1)
                      ↓
            ModelComparator.compare_metrics()
                      ↓
        winner = candidate ? → A/B Test : Skip
                      ↓
┌──────────────────────────────────────────────────────────────┐
│         A/B TESTING: Canary Deployment (10%)                 │
├──────────────────────────────────────────────────────────────┤
│ • Route 10% traffic to new model (v0.1.1)                    │
│ • Keep 90% on production model (v0.1.0)                      │
│ • Monitor metrics for 24-48 hours                            │
│ • Compare variant metrics: latency, accuracy, errors         │
└──────────────────────────────────────────────────────────────┘
                      ↓
            [A/B Test Results]
                      ↓
    winner = canary ? → PROMOTE : ROLLBACK
                      ↓
┌──────────────────────────────────────────────────────────────┐
│        DEPLOYMENT: Update Ollama Model                       │
├──────────────────────────────────────────────────────────────┤
│ • deployment_manager.py: Deploy to Ollama                    │
│ • ab_test_manager.py: Route users to model versions          │
│ • Automatic rollback if metrics degrade >5%                  │
│ • deployment_history: Track all deployments                  │
└──────────────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────────────┐
│      CONTINUOUS MONITORING & RETRAINING SCHEDULER            │
├──────────────────────────────────────────────────────────────┤
│ • Trigger 1: Scheduled (every 24 hours)                      │
│ • Trigger 2: Data-driven (50+ new approvals)                 │
│ • Trigger 3: Performance (accuracy drops >5%)                │
│ • continuous_scheduler.py: Auto-retraining loop              │
│ • training_orchestrator.py: Run full pipeline                │
└──────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Workflow

### Step 1: Export Approved Knowledge

```python
# export_approved_data.py
# Queries MongoDB for approved Q/A pairs
# Output: JSONL with messages format

{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is your return policy?"},
    {"role": "assistant", "content": "We offer 30-day returns..."}
  ]
}
```

**Command:**
```bash
python training/export_approved_data.py \
  --output models/training_data.jsonl \
  --format sft \
  --mongo-uri mongodb://localhost:27017 \
  --mongo-db rag_learning
```

### Step 2: Split Dataset

```bash
python training/split_dataset.py \
  --input models/training_data.jsonl \
  --output-dir models/splits \
  --train-ratio 0.7 \
  --val-ratio 0.15 \
  --test-ratio 0.15
```

**Output:**
- `models/splits/train.jsonl` (70%)
- `models/splits/val.jsonl` (15%)
- `models/splits/test.jsonl` (15%)

### Step 3: Train LoRA Model

```bash
python training/train_lora.py \
  --train-file models/splits/train.jsonl \
  --val-file models/splits/val.jsonl \
  --output-dir models/v0.1.0 \
  --model-name meta-llama/Llama-2-7b \
  --num-epochs 3 \
  --batch-size 8 \
  --learning-rate 0.0001 \
  --device cuda
```

**Output:**
```
models/v0.1.0/
├── adapter_config.json
├── adapter_model.bin
├── training_args.bin
├── trainer_state.json
└── training_logs.json
```

### Step 4: Merge LoRA into Base Model

```bash
python training/merge_lora.py \
  --base-model meta-llama/Llama-2-7b \
  --lora-path models/v0.1.0 \
  --output-path models/v0.1.0_merged
```

**Output:** Fully merged model ready for deployment

### Step 5: Evaluate Model

```bash
python training/evaluate_model.py \
  --model-path models/v0.1.0_merged \
  --test-file models/splits/test.jsonl \
  --output models/v0.1.0/metrics.json
```

**Output:**
```json
{
  "exact_match": 0.82,
  "token_f1": 0.88,
  "bleu": 0.75,
  "avg_response_time_ms": 250,
  "test_samples": 150
}
```

### Step 6: Compare with Baseline

```python
comparison = ModelComparator.compare_metrics(
    baseline={"exact_match": 0.78, "token_f1": 0.84, "bleu": 0.72},
    candidate={"exact_match": 0.82, "token_f1": 0.88, "bleu": 0.75}
)
# Result: winner = "candidate"
```

### Step 7: A/B Test (Optional)

Route 10% traffic to new model:

```python
from ab_test_manager import ABTestManager

ab_manager = ABTestManager(db)

# Start A/B test
await ab_manager.route_request(
    user_id="user123",
    production_model="v0.1.0",
    canary_model="v0.1.1",
    canary_percentage=10
)
# Returns: ("v0.1.1", "canary") or ("v0.1.0", "production")

# After 24 hours, check results
results = await ab_manager.get_ab_test_results("test_v0.1.1", hours=24)
winner = ABTestManager.recommend_winner(results)
```

### Step 8: Deploy Winner

```python
# Promote to production
await model_registry.promote_to_production("v0.1.1")

# Deploy to Ollama
await deployment_manager.deploy_model_to_ollama(
    "v0.1.1",
    "models/v0.1.1_merged"
)
```

---

## Running Continuous Training

### Option 1: Manual Trigger

```bash
python training/training_orchestrator.py
```

### Option 2: Scheduled (Cron)

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/backend && python training/training_orchestrator.py >> logs/training.log 2>&1
```

### Option 3: Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: model-retraining
spec:
  schedule: "0 2 * * *"  # 2 AM UTC daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: trainer
            image: training-image:latest
            command: ["python", "training/training_orchestrator.py"]
            env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: mongodb-uri
```

### Option 4: Continuous Loop

```python
from training.continuous_scheduler import ContinuousTrainingScheduler

scheduler = ContinuousTrainingScheduler(
    db=db,
    training_script_path="training/training_orchestrator.py",
    models_dir="./models",
    schedule_interval_hours=24,
    min_new_approvals=50
)

# Run scheduler (blocks)
await scheduler.run_scheduler()
```

---

## Monitoring & Metrics

### Check Training Jobs

```python
jobs = await scheduler.get_training_history(limit=10)
for job in jobs:
    print(f"{job['job_id']}: {job['status']} - {job['metrics']}")
```

### Check Production Model

```python
prod_model = await model_registry.get_production_model()
print(f"Production: {prod_model['version']}")
print(f"Metrics: {prod_model['metrics']}")
print(f"A/B traffic: {prod_model['ab_test_traffic_percentage']}%")
```

### List All Versions

```python
models = await model_registry.list_models(limit=10)
for m in models:
    status = "PRODUCTION" if m['is_production'] else "standby"
    print(f"{m['version']}: {m['metrics']['exact_match']:.2%} - {status}")
```

---

## Troubleshooting

### Training Fails: "OOM"

```python
# Reduce batch size
BATCH_SIZE=4  # or 2
NUM_GPUS=2    # Use multiple GPUs
```

### Model Doesn't Improve

1. Check data quality: `db.approved_qa.find().limit(5)`
2. Verify data is diverse and representative
3. Increase `NUM_EPOCHS` to 5-10
4. Try lower `LEARNING_RATE` (5e-5 instead of 1e-4)

### A/B Test Never Completes

```bash
# Check Ollama health
curl http://localhost:11434/api/tags

# Check MongoDB connection
mongosh "mongodb://localhost:27017"
```

### Rollback Stuck

```python
# Manually promote previous version
await model_registry.promote_to_production("v0.1.0")
await deployment_manager.deploy_model_to_ollama("v0.1.0", "models/v0.1.0")
```

---

## Production Checklist

- [ ] MongoDB backup configured
- [ ] Ollama running with GPU support
- [ ] Training logs persisted
- [ ] Monitoring alerts set up
- [ ] Rollback procedure tested
- [ ] A/B test infrastructure verified
- [ ] Model storage space: 50GB+
- [ ] Training compute: GPU with 16GB+ VRAM
- [ ] Network: Low-latency Ollama/MongoDB connection

