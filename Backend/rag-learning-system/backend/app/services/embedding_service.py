from __future__ import annotations

import asyncio
import logging
from typing import Sequence

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model: SentenceTransformer | None = None
        self._load_lock = asyncio.Lock()

    async def _ensure_model(self) -> None:
        if self._model is not None:
            return

        async with self._load_lock:
            if self._model is None:
                logger.info("Loading embedding model: %s", self.model_name)
                self._model = await asyncio.to_thread(SentenceTransformer, self.model_name)
                logger.info("Embedding model loaded.")

    async def embed_text(self, text: str) -> list[float]:
        await self._ensure_model()
        if self._model is None:
            raise RuntimeError("Embedding model is unavailable.")

        vector = await asyncio.to_thread(
            self._model.encode,
            text,
            normalize_embeddings=True,
        )
        return vector.tolist()

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        await self._ensure_model()
        if self._model is None:
            raise RuntimeError("Embedding model is unavailable.")

        vectors = await asyncio.to_thread(
            self._model.encode,
            list(texts),
            normalize_embeddings=True,
        )
        return vectors.tolist()

