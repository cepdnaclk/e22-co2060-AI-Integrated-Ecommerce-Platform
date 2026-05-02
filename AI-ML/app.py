"""
Face Recognition Microservice — FastAPI
Optimized for low-RAM VPS (1GB RAM, target < 400MB)
Uses DeepFace with SFace model (lightweight)

Endpoints:
  POST /generate-embedding   → produce 128-d face vector
  POST /verify-face           → compare live face vs stored embedding
  GET  /health                → service health check
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import face_engine
import embedding_cache

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("face_service")


# ──────────────────────────────────────
# Startup: pre-load SFace model
# ──────────────────────────────────────
@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("Pre-loading SFace model on startup...")
    try:
        face_engine._get_model()
        logger.info("Model ready.")
    except Exception as e:
        logger.error("Failed to pre-load model: %s", e)
    yield
    logger.info("Shutting down face recognition service.")


app = FastAPI(
    title="Face Recognition Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────
class EmbeddingRequest(BaseModel):
    image: str  # base64 encoded image


class VerifyRequest(BaseModel):
    image: str                    # base64 live capture
    stored_embedding: list[float] # stored embedding from DB
    admin_id: str | None = None   # optional, for cache
    threshold: float = 0.45


class EmbeddingResponse(BaseModel):
    success: bool
    embedding: list[float] | None = None
    message: str = ""


class VerifyResponse(BaseModel):
    success: bool
    verified: bool = False
    similarity: float = 0.0
    threshold: float = 0.45
    message: str = ""


# ──────────────────────────────────────
# Endpoints
# ──────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "model": "SFace"}


@app.post("/generate-embedding", response_model=EmbeddingResponse)
async def generate_embedding(req: EmbeddingRequest):
    """Generate a 128-d face embedding from a base64 image."""
    try:
        emb = face_engine.generate_embedding(req.image)
        return EmbeddingResponse(success=True, embedding=emb, message="Embedding generated")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Embedding generation failed")
        raise HTTPException(status_code=500, detail=f"Face processing error: {e}")


@app.post("/verify-face", response_model=VerifyResponse)
async def verify_face(req: VerifyRequest):
    """Verify a live face against a stored embedding."""
    try:
        # Optionally pull stored embedding from cache
        stored = req.stored_embedding
        if req.admin_id:
            cached = embedding_cache.get(req.admin_id)
            if cached:
                stored = cached

        if not stored or len(stored) == 0:
            raise HTTPException(status_code=400, detail="No stored embedding provided")

        result = face_engine.verify_face(req.image, stored, req.threshold)

        # Cache on success
        if req.admin_id and result["verified"]:
            embedding_cache.put(req.admin_id, stored)

        return VerifyResponse(
            success=True,
            verified=result["verified"],
            similarity=result["similarity"],
            threshold=result["threshold"],
            message="Face verified" if result["verified"] else "Face mismatch",
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Face verification failed")
        raise HTTPException(status_code=500, detail=f"Verification error: {e}")


# ──────────────────────────────────────
# Cache management (admin use)
# ──────────────────────────────────────
@app.post("/cache/clear")
async def clear_cache():
    embedding_cache.clear()
    return {"status": "cache cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, workers=1)
