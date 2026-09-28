# RAG Learning System Developer Guide

This directory contains the Retrieval-Augmented Generation (RAG) backend for the AI-integrated e-commerce platform.

The service combines:

- **FastAPI** for the HTTP API.
- **Sentence Transformers** for semantic embeddings.
- **ChromaDB** for persistent vector search.
- **MongoDB** for approved knowledge and metadata.
- **Ollama** for local large-language-model responses.
- An optional **approved-data fine-tuning pipeline** under `training/`.

> The implementation is intentionally approval-based: only content submitted through `/learn` is added to the knowledge base. Chat messages are not automatically treated as training data.

## Responsibilities and flow

### Chat flow

1. A client sends a question to `POST /chat`.
2. The `EmbeddingService` converts the question into an embedding using `all-MiniLM-L6-v2`.
3. `ChromaService` retrieves the most similar approved knowledge items.
4. `RAGService` builds a prompt containing the retrieved context.
5. `OllamaService` sends the prompt to the configured Ollama model.
6. The API returns the generated answer, retrieved context, and similarity scores.

### Approved learning flow

1. An administrator or trusted backend submits a question and answer to `POST /learn`.
2. `LearningService` normalizes the question and answer.
3. MongoDB stores the approved knowledge and metadata.
4. The same content is embedded and upserted into ChromaDB.
5. Submitting the same question again updates the existing MongoDB document and vector record instead of creating a duplicate.

MongoDB is the source of truth for approved records; ChromaDB is the semantic retrieval index.

## Repository layout

```text
backend/
├── app/
│   ├── main.py                    # FastAPI application and lifecycle hooks
│   ├── config.py                  # Environment-backed settings
│   ├── routes/
│   │   ├── chat.py                # /chat endpoint
│   │   └── learning.py            # /learn and /knowledge endpoints
│   ├── services/
│   │   ├── rag_service.py         # Retrieval + prompt orchestration
│   │   ├── learning_service.py    # Approved knowledge persistence
│   │   ├── chroma_service.py      # Vector storage and similarity search
│   │   ├── embedding_service.py   # Sentence Transformer embeddings
│   │   ├── ollama_service.py      # Ollama HTTP client
│   │   └── service_registry.py    # Shared service instances
│   ├── models/
│   │   ├── chat_models.py         # Chat request/response schemas
│   │   └── learning_models.py     # Learning and knowledge schemas
│   ├── database/
│   │   └── mongodb.py             # MongoDB connection management
│   └── utils/
│       └── logging_config.py      # Logging setup
├── chroma_db/                     # Persistent ChromaDB data
├── training/                      # Optional approved-data fine-tuning tools
├── requirements.txt
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

## Prerequisites

Install or make available:

- Python 3.11+ for local development.
- Docker and Docker Compose.
- Ollama running on the host machine.
- An Ollama model, by default `llama3`.

Pull and verify the default model:

```bash
ollama pull llama3
curl http://localhost:11434/api/tags
```

On Windows PowerShell, use `Invoke-WebRequest http://localhost:11434/api/tags` if `curl` is unavailable.

## Configuration

From this directory, create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Important settings:

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `RAG Learning System` | Service name returned by `/health`. |
| `APP_ENV` | `development` | Runtime environment label. |
| `LOG_LEVEL` | `INFO` | Application log level. |
| `MONGO_URI` | `mongodb://mongodb:27017` | MongoDB connection string inside Compose. |
| `MONGO_DB_NAME` | `rag_learning` | MongoDB database name. |
| `MONGO_COLLECTION_NAME` | `approved_knowledge` | Approved knowledge collection. |
| `CHROMA_PATH` | `./chroma_db` | Persistent ChromaDB directory. |
| `CHROMA_COLLECTION_NAME` | `shopping_knowledge` | ChromaDB collection name. |
| `TOP_K` | `3` | Number of retrieved contexts; valid range is 1–10. |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence Transformer model. |
| `OLLAMA_BASE_URL` | `http://localhost:11434/api/chat` | Ollama chat endpoint. |
| `OLLAMA_MODEL` | `llama3` | Model used to generate answers. |
| `OLLAMA_TIMEOUT_SECONDS` | `120` | Ollama request timeout; valid range is 10–600. |

When the backend runs in Docker, the supplied example uses `host.docker.internal` to reach Ollama on the host. Keep the following value for that setup:

```dotenv
OLLAMA_BASE_URL=http://host.docker.internal:11434/api/chat
```

When running the API directly on the host, use:

```dotenv
OLLAMA_BASE_URL=http://localhost:11434/api/chat
```

Do not commit `.env` or credentials. Update `.env.example` whenever a new required setting is introduced.

## Run with Docker Compose

From `Backend/rag-learning-system/backend`:

```bash
docker compose up --build -d
```

The services are exposed as follows:

- RAG API: `http://localhost:8000`
- MongoDB from the host: `mongodb://localhost:27018`
- Ollama: host service at `localhost:11434`

Check service status and logs:

```bash
docker compose ps
docker compose logs -f backend
```

Stop the services without deleting persistent data:

```bash
docker compose down
```

To remove the MongoDB Compose volume as well, use `docker compose down -v`. This permanently deletes the local MongoDB data.

## Run locally without Docker

Start MongoDB separately and set `MONGO_URI` to its reachable address. Then create a virtual environment:

```bash
python -m venv .venv
```

Activate it:

```bash
# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

Install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API reference

### `GET /health`

Returns a basic liveness response:

```json
{
  "status": "ok",
  "service": "RAG Learning System"
}
```

### `POST /chat`

Ask a question using the approved knowledge base.

Request:

```json
{
  "message": "Which laptop is suitable for programming?"
}
```

Constraints:

- `message` must contain 2–2000 characters.

Response:

```json
{
  "response": "...",
  "retrieved_context": ["..."],
  "similarity_scores": [0.91]
}
```

Example:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Which laptop is suitable for programming?"}'
```

### `POST /learn`

Store or update approved knowledge. Protect this endpoint with authentication and authorization before exposing it outside a trusted network.

Request:

```json
{
  "question": "What should I look for in a programming laptop?",
  "answer": "Prioritize at least 16 GB of RAM, an SSD, and a processor appropriate for the development tools you use.",
  "metadata": {
    "approved_by": "admin@shop.com",
    "topic": "laptops"
  }
}
```

Constraints:

- `question` must contain 2–2000 characters.
- `answer` must contain 2–4000 characters.
- `metadata` is optional and must be JSON-compatible.

The endpoint returns HTTP `201`:

```json
{
  "message": "Knowledge stored successfully",
  "knowledge_id": "..."
}
```

Example:

```bash
curl -X POST http://localhost:8000/learn \
  -H "Content-Type: application/json" \
  -d '{"question":"What should I look for in a programming laptop?","answer":"Prioritize at least 16 GB of RAM, an SSD, and a suitable processor.","metadata":{"approved_by":"admin","topic":"laptops"}}'
```

### `GET /knowledge`

Lists approved knowledge records from MongoDB, ordered by newest first:

```json
{
  "count": 1,
  "items": [
    {
      "id": "...",
      "question": "...",
      "answer": "...",
      "metadata": {},
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

This endpoint should also be access-controlled in production because it exposes the approved knowledge base.

## Developer workflow

1. Work from the `RAG` branch or create a feature branch from it.
2. Keep API schemas in `app/models/` and business logic in `app/services/`.
3. Do not place database or Ollama calls directly in route handlers.
4. Add or update approved knowledge through `LearningService` so MongoDB and ChromaDB remain synchronized.
5. Preserve the approval boundary: never ingest raw, unreviewed conversations automatically.
6. Run the health check and exercise `/chat` and `/learn` after changes.
7. Review logs for startup, MongoDB, embedding, ChromaDB, and Ollama failures before opening a pull request.

## Extending the system safely

### Adding a new model or provider

- Add a configuration variable to `app/config.py` and `.env.example`.
- Keep provider-specific HTTP or SDK code inside its own service.
- Inject the service through `service_registry.py` rather than constructing clients in routes.
- Add timeout handling and structured error logging.
- Document whether the provider is local, containerized, or external.

### Improving retrieval

- Tune `TOP_K` using a representative evaluation set rather than changing it blindly.
- Keep the embedding model consistent when building and querying the ChromaDB collection.
- Rebuild or migrate the vector collection when changing embedding models.
- Store useful metadata such as topic, approval source, language, and version.
- Inspect similarity scores and retrieved context when investigating poor answers.

### Updating knowledge

The current implementation uses a normalized, case-insensitive question to update an existing record. If multiple answers for the same question are required, introduce an explicit version or knowledge identifier instead of weakening the duplicate check.

## Optional fine-tuning workflow

Fine-tuning is separate from normal RAG retrieval and must use approved knowledge only. Read the documentation in `training/` before running it:

```bash
pip install -r training/requirements-finetune.txt
python training/export_approved_data.py --output-dir training_data
python training/split_dataset.py --input training_data/approved_knowledge_sft_messages.jsonl
python training/train_lora.py \
  --train-file training_data/approved_knowledge_sft_messages_train.jsonl \
  --eval-file training_data/approved_knowledge_sft_messages_val.jsonl \
  --output-dir training_output
```

Treat generated datasets, model checkpoints, and credentials as sensitive artifacts. Do not commit them unless the repository explicitly requires versioning them.

## Testing and quality checks

At minimum, verify:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

Then test this sequence:

1. Submit one approved record with `/learn`.
2. Ask a related question with `/chat`.
3. Confirm the expected context and similarity score are returned.
4. Submit the same question with revised content and verify it updates rather than duplicates.
5. Restart the containers and confirm MongoDB and ChromaDB data remain available.

Recommended future test coverage:

- Pydantic validation for request limits.
- Service-level tests for duplicate updates and vector upserts.
- Retrieval tests with known questions and expected contexts.
- Ollama timeout and unavailable-model behavior.
- MongoDB and ChromaDB restart/persistence behavior.
- Authentication and authorization for learning and knowledge-management endpoints.

## Troubleshooting

### Ollama connection errors

- Confirm Ollama is running: `curl http://localhost:11434/api/tags`.
- Confirm the model exists: `ollama list`.
- In Docker, use `host.docker.internal`, not `localhost`, for the host Ollama service.
- Check `docker compose logs -f backend` and verify `OLLAMA_BASE_URL`.

### MongoDB connection errors

- Confirm the MongoDB container is healthy: `docker compose ps`.
- Use `mongodb://mongodb:27017` from the backend container.
- Use the published host port `27018` only when connecting from the host.

### Empty or low-quality retrieval

- Add approved knowledge through `/learn`; chat alone does not populate the index.
- Check that `chroma_db` is writable and mounted.
- Confirm the embedding model is available and unchanged.
- Review `TOP_K` and the returned similarity scores.

### Data disappeared after a restart

- Ensure `./chroma_db:/app/chroma_db` is mounted.
- Do not use `docker compose down -v` unless deleting MongoDB data is intentional.
- Back up both the ChromaDB directory and the MongoDB volume.

## Production checklist

- [ ] Add authentication and role-based authorization to `/learn` and `/knowledge`.
- [ ] Restrict CORS and expose only required network ports.
- [ ] Store secrets in a secret manager, not `.env` committed to Git.
- [ ] Add rate limiting and request-size limits at the API gateway.
- [ ] Add health checks for MongoDB, ChromaDB, embeddings, and Ollama dependencies.
- [ ] Monitor latency, error rate, token usage, and retrieval scores.
- [ ] Back up MongoDB and ChromaDB and test restoration.
- [ ] Add prompt-injection and sensitive-data handling rules.
- [ ] Pin and regularly review dependency versions.
- [ ] Evaluate answer quality with a versioned test dataset before changing models or retrieval settings.

## Related documentation

- `training/README.md` — fine-tuning overview.
- `training/ARCHITECTURE.md` — training architecture.
- `training/INTEGRATION_GUIDE.md` — integration details.
- `training/USAGE_GUIDE.md` — training usage.
- `.env.example` — environment variable template.
- `docker-compose.yml` — local container topology.
