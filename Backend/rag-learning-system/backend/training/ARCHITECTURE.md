# Continuous Model Training Architecture

## Overview

Instead of RAG queries, train models continuously from approved data and deploy the best version.

```
Approved QA in MongoDB
    ↓
[Export & Prepare Data]
    ↓
[Train Model v1, v2, v3...]
    ↓
[Evaluate Metrics]
    ↓
[A/B Test]
    ↓
[Deploy Winner]
    ↓
[Monitor Performance]
    ↓
[Trigger Retraining if needed]
```

## Components

### 1. Data Pipeline
- `export_approved_data.py` - Extract approved Q/A from MongoDB
- `split_dataset.py` - Train/val/test splits
- `prepare_training_data.py` - Format for SFT

### 2. Training Pipeline
- `train_lora.py` - Train LoRA adapter
- `merge_lora.py` - Merge into base model
- `train_full_model.py` - Full model training (optional)
- `model_registry.py` - Version management

### 3. Evaluation Pipeline
- `evaluate_model.py` - Run inference on test set
- `compute_metrics.py` - BLEU, ROUGE, exact match, etc.
- `compare_models.py` - Compare versions

### 4. Deployment Pipeline
- `ab_test_manager.py` - A/B test infrastructure
- `deploy_model.py` - Deploy to Ollama
- `rollback.py` - Revert to previous version
- `metrics_tracker.py` - Real-time performance monitoring

### 5. Orchestration
- `continuous_training_scheduler.py` - Automatic retraining on schedule
- `training_orchestrator.py` - End-to-end pipeline runner

## Workflow

### Phase 1: Data Preparation
```
1. Export approved knowledge from MongoDB
2. Create train/val/test splits (70/15/15)
3. Format data for SFT training
4. Generate baseline metrics on old model
```

### Phase 2: Model Training
```
1. Train LoRA adapter on training set
2. Evaluate on validation set
3. Save checkpoint with metrics
4. Tag version: v0.1.0, v0.1.1, etc.
```

### Phase 3: Evaluation
```
1. Run inference on test set
2. Compute BLEU, ROUGE, exact match %
3. Manual review of samples
4. Compare against current production model
```

### Phase 4: A/B Testing
```
1. Deploy new model to canary traffic (10%)
2. Monitor metrics for 24-48 hours
3. If metrics improve → promote to 100%
4. If metrics degrade → rollback to previous
```

### Phase 5: Monitoring & Retraining Trigger
```
1. Track production metrics continuously
2. If accuracy drops below threshold → trigger retraining
3. If new approved QA added → schedule retraining
4. Auto-run pipeline weekly/biweekly
```

## Model Versioning

```
models/
├── v0.0.0/          # Initial baseline
│   ├── model.safetensors
│   ├── tokenizer.json
│   ├── metrics.json
│   └── metadata.json
├── v0.1.0/          # First training
│   ├── model.safetensors
│   ├── tokenizer.json
│   ├── metrics.json
│   └── metadata.json
├── v0.1.1/          # Second training
└── current → v0.1.0/  # Symlink to production
```

## Metrics Tracked

- **Training**: Loss, perplexity, learning rate
- **Validation**: BLEU, ROUGE-L, exact match %
- **Test**: Same as validation + human review score
- **Production**: Response time, user satisfaction, fallback rate

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB (Approved QA)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               Data Pipeline (Export → Split → Prep)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│        Training Pipeline (LoRA → Merge → Evaluate)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Model Registry (Version Storage)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┬──────────────────────┐
│   A/B Testing (10%)  │  Current Prod (90%)  │
│   New Model v0.1.1   │  Production v0.1.0   │
└──────────────────────┴──────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           Metrics Tracker & Auto-Retraining Trigger             │
└─────────────────────────────────────────────────────────────────┘
```

## When to Retrain

1. **Scheduled**: Weekly on Monday 2 AM
2. **Data-driven**: After 50+ new approved Q/A added
3. **Performance-driven**: If production accuracy drops >5%
4. **Event-driven**: Manual trigger by admin

## Rollback Strategy

```
1. Monitor metrics for 24-48 hours post-deployment
2. If metrics degraded → automatic rollback
3. Alert admin with comparison report
4. Review training data for issues
5. Adjust hyperparameters and retrain
```

## Time Estimates

- Data export: 2-5 min (10k approvals)
- Training (LoRA): 30-60 min (GPU)
- Evaluation: 5-10 min
- A/B testing: 24-48 hours
- Total cycle: ~2-3 hours + A/B window

