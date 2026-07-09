from __future__ import annotations

import logging

from fastapi import FastAPI

from app.config import get_settings
from app.database.mongodb import mongodb_manager
from app.routes.chat import router as chat_router
from app.routes.learning import router as learning_router
from app.services.service_registry import learning_service, ollama_service
from app.utils.logging_config import setup_logging

settings = get_settings()
setup_logging(settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Production-ready RAG learning system with FastAPI + Ollama + ChromaDB + MongoDB.",
)

app.include_router(chat_router)
app.include_router(learning_router)


@app.on_event("startup")
async def on_startup() -> None:
    await mongodb_manager.connect(settings.mongo_uri, settings.mongo_db_name)
    await learning_service.ensure_indexes()
    logger.info("Application startup complete.")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await ollama_service.close()
    await mongodb_manager.disconnect()
    logger.info("Application shutdown complete.")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": settings.app_name}

