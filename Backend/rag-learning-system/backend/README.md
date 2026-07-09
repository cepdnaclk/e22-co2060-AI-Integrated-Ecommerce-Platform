# RAG Learning System (FastAPI + Ollama + ChromaDB + MongoDB)

This service is a production-ready Retrieval-Augmented Generation (RAG) learning backend.

It supports:
1. **Question answering** with retrieved context
2. **Approved learning only** via `/learn` (no auto-training on all chats)
3. **Semantic search** using `SentenceTransformer("all-MiniLM-L6-v2")`
4. **Persistent vectors** in ChromaDB
5. **Approved knowledge storage** in MongoDB

---

## Project Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   ├── chat.py
│   │   └── learning.py
│   ├── services/
│   │   ├── ollama_service.py
│   │   ├── rag_service.py
│   │   ├── chroma_service.py
│   │   ├── embedding_service.py
│   │   ├── learning_service.py
│   │   └── service_registry.py
│   ├── models/
│   │   ├── chat_models.py
│   │   └── learning_models.py
│   ├── database/
│   │   └── mongodb.py
│   └── utils/
│       └── logging_config.py
├── chroma_db/
├── requirements.txt
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

---

## Step-by-Step Setup

### 1. Start Ollama locally (outside Docker)

Install Ollama and pull model:

```powershell
ollama pull llama3
```

Verify:

```powershell
curl http://localhost:11434/api/tags
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```powershell
copy .env.example .env
```

### 3. Run with Docker

From this `backend` folder:

```powershell
docker compose up --build -d
```

### 4. Health check

```powershell
curl http://localhost:8000/health
```

---

## API Endpoints

### POST `/chat`

Request:

```json
{
  "message": "Best gaming mouse?"
}
```

Response:

```json
{
  "response": "...",
  "retrieved_context": [
    "...",
    "...",
    "..."
  ],
  "similarity_scores": [0.91, 0.87, 0.81]
}
```

### POST `/learn`

Use this only after admin approval.

Request:

```json
{
  "question": "Which mouse is best for FPS games?",
  "answer": "Choose a lightweight mouse with low click latency and reliable sensor tracking.",
  "metadata": {
    "approved_by": "admin@shop.com",
    "topic": "gaming-mouse"
  }
}
```

Response:

```json
{
  "message": "Knowledge stored successfully",
  "knowledge_id": "..."
}
```

### GET `/knowledge`

Returns all approved knowledge from MongoDB.

---

## Example cURL Requests

```powershell
curl -X POST http://localhost:8000/learn ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"Best laptop for coding?\",\"answer\":\"Pick 16GB RAM minimum and SSD storage.\",\"metadata\":{\"approved_by\":\"admin\"}}"
```

```powershell
curl -X POST http://localhost:8000/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Which laptop should I buy for programming?\"}"
```

```powershell
curl http://localhost:8000/knowledge
```

---

## Production Notes

1. Keep Ollama running on the host machine and monitor model latency.
2. Use reviewed approvals only for `/learn` to keep knowledge quality high.
3. Back up both MongoDB and `chroma_db` volume regularly.
4. Add authentication/authorization in front of `/learn` in real production.

---

## Fine-tuning from approved knowledge (optional)

This project includes a safe fine-tuning pipeline in `training/` that only uses approved knowledge from MongoDB.

See:

```text
training/README.md
```

Quick start:

```powershell
pip install -r training/requirements-finetune.txt
python training/export_approved_data.py --output-dir training_data
python training/split_dataset.py --input training_data/approved_knowledge_sft_messages.jsonl
python training/train_lora.py --train-file training_data/approved_knowledge_sft_messages_train.jsonl --eval-file training_data/approved_knowledge_sft_messages_val.jsonl --output-dir training_outputs/lora_adapter
```

