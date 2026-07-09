# Quick Reference Card

## 🎯 Training System at a Glance

### What It Does
```
Approved Q/A → Train Model → Evaluate → A/B Test → Deploy Winner
                (automatic, recurring)
```

### File Map

| Path | Purpose | When to Use |
|------|---------|------------|
| `training/README.md` | Overview | First time |
| `training/ARCHITECTURE.md` | Design | Understand system |
| `training/USAGE_GUIDE.md` | Step-by-step | Do the work |
| `training/TRAINING_CONFIG.md` | Configuration | Tune parameters |
| `training/INTEGRATION_GUIDE.md` | API wiring | Connect to backend |

### Core Scripts

```
training_orchestrator.py
  └─ Runs ENTIRE pipeline:
     1. export_approved_data.py
     2. split_dataset.py
     3. train_lora.py
     4. metrics_calculator.py
     5. ab_test_manager.py
     6. deployment_manager.py
```

---

## 🚀 Commands Cheat Sheet

### Setup
```bash
pip install -r requirements-finetune.txt
export MONGODB_URI=mongodb://localhost:27017
export DEVICE=cuda
```

### Run Training
```bash
# Full pipeline (recommended)
python training/training_orchestrator.py

# Or individual steps
python training/export_approved_data.py
python training/split_dataset.py --input data.jsonl
python training/train_lora.py --train-file train.jsonl
python training/merge_lora.py --lora-path models/v0.1.0
```

### Check Status (via API)
```bash
curl http://localhost:8000/api/training/status
curl http://localhost:8000/api/training/models/list
curl -X POST http://localhost:8000/api/training/trigger-retraining
```

### Query MongoDB
```python
# Latest training job
db.training_jobs.find({}).sort({created_at: -1}).limit(1)

# All models
db.model_versions.find({}).sort({created_at: -1})

# Production model
db.model_versions.find_one({is_production: true})

# A/B test results
db.ab_tests.find({created_at: {$gte: Date("2024-01-15")}})
```

---

## ⚙️ Configuration

```env
# Data
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=rag_learning

# Model
BASE_MODEL=meta-llama/Llama-2-7b
NUM_EPOCHS=3
BATCH_SIZE=8
LEARNING_RATE=0.0001

# Hardware
DEVICE=cuda
NUM_GPUS=1

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# Scheduling
SCHEDULE_INTERVAL_HOURS=24
MIN_NEW_APPROVALS_TO_TRIGGER=50
CANARY_TRAFFIC_PERCENTAGE=10
```

---

## 📊 Metrics Reference

| Metric | Good Range | What It Means |
|--------|-----------|--------------|
| **Exact Match %** | 80%+ | Perfect Q/A matches |
| **Token F1** | 85%+ | Word overlap quality |
| **BLEU** | 70%+ | N-gram similarity |
| **Response Time** | <500ms | Inference speed |
| **Error Rate** | 0-2% | Reliability |

---

## 🔄 Pipeline States

```
pending
   ↓ (time passes or data threshold hit)
in_progress
   ├─ [export] → [split] → [train]
   ├─ [evaluate] → [compare vs baseline]
   └─ if better: [A/B test 24h] → [deploy or rollback]
   ↓
completed (or failed)
```

---

## 📈 Expected Progression

```
Baseline Model (70% accuracy)
   ↓ 1st training cycle
v0.1.0 (78% accuracy) → A/B tested → PROMOTED
   ↓ 2nd training cycle
v0.1.1 (82% accuracy) → A/B tested → PROMOTED
   ↓ 3rd training cycle
v0.1.2 (84% accuracy) → A/B tested → PROMOTED
   ↓
Continuous improvement...
```

---

## ⚠️ Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| **OOM (Out of Memory)** | `BATCH_SIZE=4`, `NUM_GPUS=2` |
| **Training too slow** | Add GPU, increase `LEARNING_RATE` to 2e-4 |
| **Model doesn't improve** | Check data quality, increase `NUM_EPOCHS` to 5-10 |
| **A/B test stuck** | Check Ollama: `curl http://localhost:11434/api/tags` |
| **MongoDB connection fails** | Verify URI: `mongosh "mongodb://localhost:27017"` |
| **Rollback needed** | Promote previous: `POST /api/training/models/promote/v0.1.0` |

---

## 🎯 Decision Tree

```
Do I have 50+ approved Q/A?
├─ NO → Just use RAG for now
└─ YES → Ready for training!
         ↓
         Run: python training/training_orchestrator.py
         ↓
         Did training metrics improve?
         ├─ NO → Review data quality, adjust hyperparams, retry
         └─ YES → A/B testing starts (24 hours)
                  ↓
                  Is new model better in A/B test?
                  ├─ YES → Promoted to production! 🎉
                  └─ NO → Rollback to previous, analyze why
```

---

## 📁 Key Files to Know

```
training/
├── training_orchestrator.py     ← RUN THIS (end-to-end)
├── model_registry.py            ← Check: production_model, list_models()
├── metrics_calculator.py        ← Understand: exact_match, token_f1, bleu
├── ab_test_manager.py           ← Route: which model for which user
├── continuous_scheduler.py      ← Trigger: when to retrain
│
├── export_approved_data.py      ← Step 1: Export
├── split_dataset.py             ← Step 2: Split
├── train_lora.py                ← Step 3: Train
├── merge_lora.py                ← Step 4: Merge
│
├── README.md                    ← Overview
├── ARCHITECTURE.md              ← Design
├── USAGE_GUIDE.md              ← How-to
├── TRAINING_CONFIG.md          ← Settings
└── INTEGRATION_GUIDE.md        ← API wiring
```

---

## 🔐 Data Safety

✓ Only approved Q/A used (no auto-training on all chats)
✓ Previous models kept (can rollback anytime)
✓ A/B testing before full deployment (gradual rollout)
✓ Automatic rollback if metrics drop >5%
✓ Complete audit trail in MongoDB

---

## ⏱️ Time Estimates

| Task | Duration |
|------|----------|
| Data export | 2-5 min |
| Data split | 1 min |
| LoRA training | 30-60 min (GPU) |
| Evaluation | 5-10 min |
| **Total training cycle** | **1-2 hours** |
| A/B testing | 24-48 hours |
| **Full cycle (train + A/B + deploy)** | **2-3 days** |

---

## 📞 When to Contact Support

- ✓ Questions about architecture → Check ARCHITECTURE.md
- ✓ Questions about usage → Check USAGE_GUIDE.md
- ✓ Questions about config → Check TRAINING_CONFIG.md
- ✓ Questions about API → Check INTEGRATION_GUIDE.md
- ✓ Script errors → Check USAGE_GUIDE.md troubleshooting

---

## 🎓 Reading Order (Recommended)

1. **This page** (5 min) ← You are here
2. **README.md** (10 min) - Overview
3. **ARCHITECTURE.md** (15 min) - System design
4. **USAGE_GUIDE.md** (30 min) - Full walkthrough
5. **Run pilot training** (30 min) - Test it
6. **INTEGRATION_GUIDE.md** (20 min) - API wiring
7. **TRAINING_CONFIG.md** (15 min) - Tuning

**Total: 2 hours to full mastery**

---

## ✅ Launch Checklist

- [ ] MongoDB running and accessible
- [ ] Ollama running with GPU support
- [ ] Python env with torch/transformers
- [ ] 50GB+ disk space available
- [ ] Read README.md
- [ ] Read ARCHITECTURE.md
- [ ] Configured .env file
- [ ] Run pilot training successfully
- [ ] API endpoints tested
- [ ] Continuous scheduler enabled
- [ ] Monitoring alerts configured
- [ ] Rollback procedure tested

---

**Ready to train? Start with `README.md`!** 🚀
