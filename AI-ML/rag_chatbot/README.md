# Simple RAG Chatbot (DeepSeek, Gemini, or Ollama + Nomic)

This is a minimal retrieval-augmented generation (RAG) chatbot built with:

- **LLM**: DeepSeek API (`deepseek-chat`), Gemini (`models/gemini-2.0-flash`), or local Ollama (`llama3.2:1b`)
- **Embeddings**: Nomic (`nomic-embed-text-v1.5`)
- **Vector DB**: ChromaDB (local persistent store)

## 1. Requirements

- Python **3.10+**
- A DeepSeek **or** Gemini API key (not needed for Ollama)
- A Nomic API key
- Text knowledge files in `data/` (`.txt` or `.md`)

Install dependencies:

```powershell
pip install -r requirements.txt
```

## 2. How to get API keys

### DeepSeek API key

1. Go to **https://platform.deepseek.com/**
2. Sign in / create an account
3. Open **API Keys**
4. Create a new key and copy it

### Nomic API key

1. Go to **https://atlas.nomic.ai/**
2. Sign in / create an account
3. Open account settings and create an API key
4. Copy the key

### Gemini API key (optional)

1. Go to **https://makersuite.google.com/app/apikey**
2. Sign in / create a Google account
3. Create an API key and copy it

### Ollama (local, no cloud API key)

1. Install Ollama from **https://ollama.com/download**
2. Pull a model (example): `ollama pull llama3.2:1b`

## 3. Configure environment

```powershell
copy .env.example .env
```

Set your keys in `.env` (choose one LLM provider):

```env
DEEPSEEK_API_KEY=...
NOMIC_API_KEY=...
LLM_PROVIDER=deepseek
```

Or for Gemini:

```env
GEMINI_API_KEY=...
NOMIC_API_KEY=...
LLM_PROVIDER=gemini
GEMINI_MODEL=models/gemini-2.0-flash
```

Or for Ollama:

```env
NOMIC_API_KEY=...
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2:1b
```

## 4. Add your knowledge files

Put your `.txt` / `.md` files in:

```text
data\
```

Example file is included in `data\sample_faq.txt`.

## 5. Build the vector database

```powershell
python ingest.py --reset
```

## 6. Start chatbot

```powershell
python chat.py
```

Type `exit` to quit.

## 7. Start HTTP API mode (for project frontend/backend integration)

Run a FastAPI server that exposes:
- `GET /health`
- `POST /chat`
- `POST /reindex`

```powershell
uvicorn api:app --host 0.0.0.0 --port 8010
```

### API request format

```json
{
  "currentMessage": "What should I buy for rainy weather commuting?",
  "history": [
    { "role": "user", "text": "I need a laptop bag." },
    { "role": "model", "text": "Do you travel in rain often?" }
  ]
}
```

### MongoDB linkage

When `MONGO_URI` is set, `/reindex` and first-time auto-indexing ingest product data from your existing project database (`products` collection) into ChromaDB vectors.

## 8. Run with Docker (Ollama + RAG)

From `AI-ML\rag_chatbot`:

1. Start services:

```powershell
docker compose up -d
```

2. Download Ollama model inside container:

```powershell
docker compose exec ollama ollama pull llama3.2:1b
```

3. Build embeddings:

```powershell
docker compose exec rag python ingest.py --reset
```

4. Start chatbot:

```powershell
docker compose exec rag python chat.py
```

Or run API mode in the same container:

```powershell
docker compose exec rag uvicorn api:app --host 0.0.0.0 --port 8010
```
