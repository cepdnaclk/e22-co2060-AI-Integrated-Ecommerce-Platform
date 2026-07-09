# Integration: Connect Training to Backend Chat API

This guide shows how to integrate the training system with your existing chat API.

## Architecture

```
Frontend Chat Button
        ↓
Backend /api/chat
        ↓
    Decide Route:
    ├→ RAG (current) - Fast retrieval for one-off questions
    └→ Trained Model (new) - Use latest trained model for inference
```

## Backend Integration Points

### 1. Add Training Routes to FastAPI

**File:** `Backend/rag-learning-system/backend/app/routes/training.py`

```python
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Any

from app.services.learning_service import LearningService
from app.models.learning_models import ApprovedQARequest

router = APIRouter(prefix="/training", tags=["training"])

@router.post("/trigger-retraining")
async def trigger_retraining(background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    Admin endpoint to manually trigger model retraining.
    """
    from training.training_orchestrator import TrainingOrchestrator
    import os
    
    config = {
        "mongodb_uri": os.getenv("MONGODB_URI"),
        "mongodb_db": os.getenv("MONGODB_DB"),
        "ollama_url": os.getenv("OLLAMA_URL"),
        "models_dir": "./models",
        "base_model": "meta-llama/Llama-2-7b",
        "export_script_path": "./training/export_approved_data.py",
        "split_script_path": "./training/split_dataset.py",
        "train_script_path": "./training/train_lora.py",
    }
    
    async def run_training():
        orchestrator = TrainingOrchestrator(config)
        await orchestrator.initialize()
        result = await orchestrator.run_full_pipeline()
        return result
    
    background_tasks.add_task(run_training)
    
    return {
        "status": "Training started in background",
        "check_status": "/training/status"
    }


@router.get("/status")
async def get_training_status() -> dict[str, Any]:
    """Get latest training job status."""
    # Query MongoDB for latest job
    from app.database.mongodb import get_db
    db = await get_db()
    
    job = await db["training_jobs"].find_one({}, sort=[("created_at", -1)])
    
    if not job:
        return {"status": "no_training_jobs"}
    
    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "triggered_by": job["triggered_by"],
        "metrics": job.get("metrics", {}),
        "error": job.get("error")
    }


@router.get("/models/list")
async def list_trained_models() -> dict[str, Any]:
    """List all trained model versions."""
    from app.database.mongodb import get_db
    from training.model_registry import ModelRegistry
    
    db = await get_db()
    registry = ModelRegistry(db)
    
    models = await registry.list_models(limit=10)
    
    return {
        "models": [
            {
                "version": m["version"],
                "status": "PRODUCTION" if m.get("is_production") else "standby",
                "metrics": m.get("metrics", {}),
                "created_at": m["created_at"].isoformat()
            }
            for m in models
        ]
    }


@router.post("/models/promote/{version}")
async def promote_model(version: str) -> dict[str, Any]:
    """Promote a specific model version to production."""
    from app.database.mongodb import get_db
    from training.model_registry import ModelRegistry
    
    db = await get_db()
    registry = ModelRegistry(db)
    
    existing = await registry.get_model(version)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Model {version} not found")
    
    await registry.promote_to_production(version)
    
    return {"message": f"Promoted {version} to production"}
```

### 2. Update Chat Endpoint to Use Both RAG and Trained Models

**File:** `Backend/rag-learning-system/backend/app/routes/chat.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from typing import Any
import os

from app.models.chat_models import ChatRequest, ChatResponse
from app.services.rag_service import RAGService
from app.services.ollama_service import OllamaService
from app.database.mongodb import get_db
from training.model_registry import ModelRegistry

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/v1")
async def chat_v1(request: ChatRequest, db=Depends(get_db)) -> ChatResponse:
    """
    Chat endpoint that intelligently chooses between:
    1. RAG (retrieval-based) - for knowledge-based questions
    2. Trained Model (inference-based) - for general reasoning
    """
    
    user_message = request.message
    
    # Get production model info
    registry = ModelRegistry(db)
    prod_model = await registry.get_production_model()
    
    use_trained_model = False
    if prod_model and prod_model.get("metrics", {}).get("exact_match", 0) > 0.75:
        use_trained_model = True
    
    # Decide which path to use
    if use_trained_model and _should_use_trained_model(user_message):
        # Use trained model
        response, context = await _answer_with_trained_model(user_message, db)
    else:
        # Use RAG
        rag_service = RAGService(db)
        response, context = await rag_service.generate_response(user_message)
    
    return ChatResponse(
        response=response,
        retrieved_context=context,
        model_type="trained" if use_trained_model else "rag"
    )


def _should_use_trained_model(message: str) -> bool:
    """
    Heuristic: Use trained model for general reasoning,
    RAG for knowledge base lookups.
    """
    rag_keywords = ["product", "price", "return", "shipping", "inventory"]
    return not any(kw in message.lower() for kw in rag_keywords)


async def _answer_with_trained_model(message: str, db: Any) -> tuple[str, list[str]]:
    """
    Call trained model via Ollama inference.
    """
    registry = ModelRegistry(db)
    prod_model = await registry.get_production_model()
    
    if not prod_model:
        raise HTTPException(status_code=404, detail="No production model available")
    
    ollama_service = OllamaService(
        model_name=prod_model["version"],
        url=os.getenv("OLLAMA_URL", "http://localhost:11434")
    )
    
    response = await ollama_service.chat([
        {
            "role": "system",
            "content": "You are a helpful shopping assistant."
        },
        {
            "role": "user",
            "content": message
        }
    ])
    
    return response, []  # No context for trained models
```

### 3. Approve Chat for Learning

Update `/learn` endpoint to queue approved responses for training:

```python
@router.post("/learn")
async def learn_from_chat(request: ApprovedQARequest, db=Depends(get_db)) -> dict[str, Any]:
    """
    Store approved Q/A for model training.
    """
    learning_service = LearningService(db)
    
    # Store in MongoDB
    result = await learning_service.store_approved_qa(
        question=request.question,
        answer=request.answer,
        metadata={"approved_by": request.approved_by, "timestamp": datetime.utcnow()}
    )
    
    # Check if we should trigger retraining
    approvals = await db["approved_qa"].count_documents({})
    
    if approvals % 50 == 0:  # Every 50 approvals
        return {
            "message": "Knowledge stored. Retraining scheduled!",
            "total_approvals": approvals,
            "retraining_triggered": True
        }
    
    return {
        "message": "Knowledge stored",
        "total_approvals": approvals,
        "retraining_triggered": False
    }
```

### 4. Middleware for Model Version Tracking

Add to `main.py`:

```python
from fastapi import Request
import time

@app.middleware("http")
async def track_model_usage(request: Request, call_next):
    """Track which model version handled each request."""
    if request.url.path == "/api/chat":
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log to MongoDB
        db = request.app.state.db
        await db["chat_metrics"].insert_one({
            "timestamp": datetime.utcnow(),
            "model_type": "trained" if "trained" in request.headers.get("model-type", "") else "rag",
            "response_time_ms": process_time * 1000,
            "status_code": response.status_code
        })
        
        return response
    
    return await call_next(request)
```

## Frontend Integration

### Update Chat Button to Show Model Status

**File:** `Frontend/my-react-app/src/components/ChatBot.js`

```javascript
import React, { useState, useEffect } from 'react';

function ChatBot() {
  const [modelStatus, setModelStatus] = useState(null);
  const [usingTrained, setUsingTrained] = useState(false);

  useEffect(() => {
    // Check which model is in use
    fetch('/api/training/models/list')
      .then(r => r.json())
      .then(data => {
        const prodModel = data.models?.find(m => m.status === "PRODUCTION");
        if (prodModel) {
          setModelStatus({
            version: prodModel.version,
            accuracy: prodModel.metrics?.exact_match?.toFixed(2)
          });
          setUsingTrained(true);
        }
      });
  }, []);

  const sendMessage = async (message) => {
    const response = await fetch('/api/chat/v1', {
      method: 'POST',
      body: JSON.stringify({ message }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    return {
      text: data.response,
      source: data.model_type === 'trained' ? 'Trained Model' : 'Knowledge Base'
    };
  };

  return (
    <div className="chatbot">
      {usingTrained && modelStatus && (
        <div className="model-badge">
          Using AI Model v{modelStatus.version} ({modelStatus.accuracy}% accuracy)
        </div>
      )}
      
      {/* Chat UI */}
    </div>
  );
}

export default ChatBot;
```

## Docker Compose Updates

**File:** `Backend/rag-learning-system/docker-compose.yml`

```yaml
services:
  backend:
    build: .
    environment:
      MONGODB_URI: mongodb://mongodb:27017
      MONGODB_DB: rag_learning
      OLLAMA_URL: http://host.docker.internal:11434
      TRAINING_ENABLED: "true"
      SCHEDULE_INTERVAL_HOURS: 24
    volumes:
      - ./models:/app/models
      - ./logs:/app/logs
  
  mongodb:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db
  
  scheduler:
    # Optional: separate service for training scheduler
    build: .
    command: python -m training.continuous_scheduler
    environment:
      MONGODB_URI: mongodb://mongodb:27017
      MONGODB_DB: rag_learning
    depends_on:
      - mongodb
    volumes:
      - ./models:/app/models

volumes:
  mongodb_data:
```

## Deployment Flow

```
1. Chat request comes in → /api/chat/v1
   ↓
2. Decides: Use trained model OR RAG
   ↓
3. If trained model: Call Ollama with model version
   ↓
4. Log response to MongoDB
   ↓
5. Return response to frontend
   ↓
6. Admin approves answer → POST /learn
   ↓
7. Add to training dataset
   ↓
8. Scheduler detects 50+ new approvals
   ↓
9. Trigger retraining: training_orchestrator.run_full_pipeline()
   ↓
10. Train, evaluate, A/B test, promote new model
```

## API Examples

### Check Training Status

```bash
curl http://localhost:8000/api/training/status
```

Response:
```json
{
  "job_id": "train-2024-01-15T14:30:22",
  "status": "completed",
  "triggered_by": "data_driven",
  "metrics": {
    "exact_match": 0.82,
    "token_f1": 0.88,
    "bleu": 0.75
  }
}
```

### List Models

```bash
curl http://localhost:8000/api/training/models/list
```

### Promote Model

```bash
curl -X POST http://localhost:8000/api/training/models/promote/v0.1.1
```

### Chat with Model Tracking

```bash
curl -X POST http://localhost:8000/api/chat/v1 \
  -H "Content-Type: application/json" \
  -d '{"message": "What products do you have?"}'
```

Response includes `model_type`:
```json
{
  "response": "We have...",
  "model_type": "trained",
  "retrieved_context": []
}
```

