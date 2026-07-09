# Training Pipeline Configuration

This section configures the continuous model training system.

## Environment Variables

```bash
# Training Data
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=rag_learning

# Model Training
BASE_MODEL=meta-llama/Llama-2-7b
NUM_EPOCHS=3
BATCH_SIZE=8
LEARNING_RATE=0.0001

# Hardware
DEVICE=cuda  # or cpu
NUM_GPUS=1

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# Scheduling
SCHEDULE_INTERVAL_HOURS=24
MIN_NEW_APPROVALS_TO_TRIGGER=50

# A/B Testing
AB_TEST_DURATION_HOURS=24
CANARY_TRAFFIC_PERCENTAGE=10
PERFORMANCE_DEGRADATION_THRESHOLD=5  # percent
```

## Directory Structure

```
models/
├── v0.0.0/                    # Initial baseline
│   ├── model.safetensors
│   ├── tokenizer.json
│   ├── metrics.json
│   └── metadata.json
├── v0.1.0/                    # First training
│   ├── adapter_config.json
│   ├── adapter_model.bin
│   ├── metrics.json
│   └── training_config.json
├── v0.1.1/                    # Second training
│   └── ...
└── current → v0.1.0/          # Symlink to production
```

## Training Schedule Triggers

### 1. Time-based
- Default: Every 24 hours (2 AM UTC)
- Configurable: `SCHEDULE_INTERVAL_HOURS`

### 2. Data-driven
- Triggers after `MIN_NEW_APPROVALS_TO_TRIGGER` new Q/A pairs added
- Default: 50 approvals

### 3. Performance-based
- Triggers if production accuracy drops >5%
- Configurable: `PERFORMANCE_DEGRADATION_THRESHOLD`

## Metrics Tracked

### Training Metrics
- Loss curve (training & validation)
- Perplexity
- Learning rate schedule

### Evaluation Metrics
- Exact match %
- Token-level F1
- BLEU score
- Average response time

### Production Metrics
- Response latency (ms)
- User satisfaction score (if available)
- Error rate
- Fallback rate

## A/B Testing Configuration

### Canary Deployment
- Start: 10% traffic to new model
- Duration: 24 hours minimum
- Decision criteria: 
  - If new model better: promote to 100%
  - If same/worse: rollback to previous

### Traffic Routing
```python
# Deterministic routing based on user ID hash
user_hash = hash(user_id) % 100
if user_hash < CANARY_TRAFFIC_PERCENTAGE:
    use_canary_model()
else:
    use_production_model()
```

## Automated Rollback Triggers

1. **Accuracy drop >5%**: Auto-rollback to previous
2. **Error rate >2%**: Auto-rollback to previous
3. **Latency >500ms**: Auto-rollback to previous

## Pipeline Logging

Logs stored in MongoDB:
- `training_jobs`: Records of all training runs
- `ab_tests`: A/B test metrics and decisions
- `production_metrics`: Real-time monitoring data
- `deployment_history`: Model version deployments

Query recent training:
```python
db.training_jobs.find({}).sort({created_at: -1}).limit(5)
```

## Model Versioning Scheme

```
Format: vMAJOR.MINOR.PATCH

v0.0.0 - Initial baseline
v0.1.0 - First training iteration
v0.1.1 - Second training iteration
v0.2.0 - Major model change (different base model, hyperparams, etc.)
v1.0.0 - First production-stable release
```

## Deployment Health Checks

Before promoting a model:
1. ✓ Ollama connection working
2. ✓ Model loaded successfully
3. ✓ Sample inference <1s
4. ✓ Metrics better than baseline
5. ✓ No critical errors in training logs

## Maintenance Tasks

### Weekly
- Review training logs for errors
- Check model performance metrics
- Verify A/B test results

### Monthly
- Audit approved Q/A quality
- Update model baselines
- Retrain with full dataset if major changes

### Quarterly
- Update base model (if new versions available)
- Experiment with new hyperparameters
- Clean old model versions (keep last 5)

## Cost Optimization

### GPU Memory
- Use LoRA for <13B models (4-8GB)
- Use int8 quantization for inference
- Batch inference if possible

### Storage
- Keep only last 5 model versions
- Compress old models to archive storage
- Delete training checkpoints after success

### Compute
- Reuse GPU across training jobs
- Use spot instances if available
- Schedule training during off-peak hours
