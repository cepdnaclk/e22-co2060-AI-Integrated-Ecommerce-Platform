# Complete Training System

A production-ready **batch model fine-tuning system** that replaces query-by-query RAG with continuous model improvement from approved Q/A data.

## 📚 Documentation

- **[README.md](./README.md)** - Overview & quick start (you are here)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - High-level system design
- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Detailed step-by-step walkthrough
- **[TRAINING_CONFIG.md](./TRAINING_CONFIG.md)** - Configuration reference
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - How to wire with backend API

## 🎯 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements-finetune.txt
```

### 2. Configure Environment
```bash
export MONGODB_URI=mongodb://localhost:27017
export MONGODB_DB=rag_learning
export OLLAMA_URL=http://localhost:11434
export OLLAMA_MODEL=llama3.2:1b
export DEVICE=cuda
```

### 3. Run Training Pipeline
```bash
python training/training_orchestrator.py
```

Expected output:
```
STEP 1: Export Approved Q/A → models/training_data_...jsonl
STEP 2: Split Dataset → 70% train, 15% val, 15% test
STEP 3: Train Model (LoRA) → models/v20240115.../
STEP 4: Evaluate Model → exact_match: 82%, token_f1: 88%
STEP 5: Compare with Baseline → winner=candidate
STEP 6: A/B Test (10% traffic) → 24 hours
STEP 7: Deploy (PROMOTE) → Version promoted to production
```

## 📁 Project Structure

```
training/
├── README.md                      ← Overview (you are here)
├── ARCHITECTURE.md                ← System design & workflow
├── USAGE_GUIDE.md                ← Detailed step-by-step
├── TRAINING_CONFIG.md            ← Configuration reference
├── INTEGRATION_GUIDE.md          ← Backend integration
│
├── 📜 Data Pipeline
│   ├── export_approved_data.py    ← MongoDB → JSONL
│   └── split_dataset.py           ← 70/15/15 split
│
├── 🧠 Training Pipeline
│   ├── train_lora.py              ← LoRA fine-tuning
│   └── merge_lora.py              ← Merge adapter into base
│
├── 📊 Management
│   ├── model_registry.py          ← Version tracking
│   ├── metrics_calculator.py      ← BLEU, F1, exact match
│   ├── ab_test_manager.py         ← Canary deployment
│   ├── continuous_scheduler.py    ← Auto-retraining trigger
│   └── training_orchestrator.py   ← End-to-end pipeline
│
└── requirements-finetune.txt      ← Dependencies
```

## 🔄 How It Works

### Before (RAG Per-Query):
```
Q: "What's your return policy?"
    ↓ Search ChromaDB for knowledge
    ↓ Inject into prompt
    ↓ Model generates response
→ Model never improves
```

### After (Batch Training):
```
50+ Approved Q/A in MongoDB
    ↓ Export → Split → Train → Evaluate
    ↓ Compare vs baseline → A/B Test → Deploy
    ↓ Retrain automatically (daily/on-demand)
→ Model continuously improves from your data
```

## ⚡ Key Features

✓ **Approved-only learning** - No auto-training on all chats
✓ **Batch fine-tuning** - Weekly/daily scheduled retraining
✓ **A/B testing** - Gradual canary rollout (10% → 100%)
✓ **Auto-rollback** - If metrics degrade >5%
✓ **Version control** - Complete deployment history
✓ **Production ready** - Logging, monitoring, error handling

## 🚀 Core Workflows

### 1. One-Time Training
```bash
python training/training_orchestrator.py
```

### 2. Continuous Auto-Retraining (Daily)
```bash
# Via cron:
0 2 * * * python /path/training_orchestrator.py

# Via Docker:
docker-compose up scheduler
```

### 3. Manual API Trigger
```bash
curl -X POST http://localhost:8000/api/training/trigger-retraining
curl http://localhost:8000/api/training/status
curl http://localhost:8000/api/training/models/list
```

## 📊 Metrics

### Training Quality
- **Exact Match %**: Perfectly matching responses (target: 80%+)
- **Token F1**: Word overlap (target: 85%+)
- **BLEU Score**: N-gram precision (target: 70%+)

### Production
- Response latency (ms)
- Error rate (%)
- Accuracy on live traffic

## 🔧 Configuration

**File:** `.env`

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=rag_learning
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
BASE_MODEL=meta-llama/Llama-2-7b
NUM_EPOCHS=3
BATCH_SIZE=8
LEARNING_RATE=0.0001
DEVICE=cuda
SCHEDULE_INTERVAL_HOURS=24
MIN_NEW_APPROVALS_TO_TRIGGER=50
```

See [TRAINING_CONFIG.md](./TRAINING_CONFIG.md) for full reference.

## ⏰ Retraining Triggers

| Trigger | When | Frequency |
|---------|------|-----------|
| **Scheduled** | Nightly at 2 AM | Every 24 hours |
| **Data-driven** | 50+ new approvals added | Whenever threshold hit |
| **Performance** | Accuracy drops >5% | Immediate |

## 📚 Next Steps

1. **Read [ARCHITECTURE.md](./ARCHITECTURE.md)** - System design overview
2. **Read [USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Detailed walkthrough with examples
3. **Read [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Wire with backend chat API
4. **Run pilot training** - Test with existing approved Q/A data
5. **Set up continuous scheduler** - Enable auto-retraining
6. **Monitor in production** - Track metrics, set up alerts

## ✅ Requirements

- GPU with 16GB+ VRAM (for LoRA on 7B models)
- MongoDB (shared with main app)
- Ollama running locally
- Python 3.10+ with PyTorch
- 50GB+ disk space (model versions)

## 📦 Dependencies

```
transformers>=4.36
datasets
torch>=2.0
peft>=0.7
trl>=0.7
sentence-transformers
motor
chromadb
numpy
scikit-learn
```

Install:
```bash
pip install -r requirements-finetune.txt
```

## 🤝 Integration

Seamless integration with chat API:

```
POST /api/chat → Use RAG or Trained Model (auto-decided)
POST /api/learn → Approve answer → Store for training
POST /api/training/trigger-retraining → Manual trigger
GET /api/training/status → Check job status
GET /api/training/models/list → List versions
```

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for code.

## 🆘 Troubleshooting

**Training fails with OOM:**
```python
BATCH_SIZE=4  # Reduce
NUM_GPUS=2    # Increase GPUs
```

**Model doesn't improve:**
- Verify approved Q/A data quality
- Increase NUM_EPOCHS (try 5-10)
- Adjust LEARNING_RATE (try 5e-5)

**A/B test issues:**
- Verify Ollama running: `curl http://localhost:11434/api/tags`
- Check MongoDB: `mongosh mongodb://localhost:27017`

See [USAGE_GUIDE.md](./USAGE_GUIDE.md) troubleshooting section.

## 📝 Legacy Scripts (Still Available)

Original step-by-step scripts:

```bash
# Step 1: Export
python training/export_approved_data.py --output-dir training_data

# Step 2: Split
python training/split_dataset.py --input training_data/approved_knowledge_sft_messages.jsonl

# Step 3: Train
python training/train_lora.py \
  --train-file training_data/approved_knowledge_sft_messages_train.jsonl \
  --eval-file training_data/approved_knowledge_sft_messages_val.jsonl \
  --base-model meta-llama/Meta-Llama-3-8B-Instruct

# Step 4: Merge
python training/merge_lora.py \
  --base-model meta-llama/Meta-Llama-3-8B-Instruct \
  --adapter-path training_outputs/lora_adapter \
  --output-dir training_outputs/merged_model
```

