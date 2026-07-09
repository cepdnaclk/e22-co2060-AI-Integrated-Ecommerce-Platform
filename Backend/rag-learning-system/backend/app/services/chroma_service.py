from __future__ import annotations

import logging
from typing import Any

import chromadb

logger = logging.getLogger(__name__)


class ChromaService:
    def __init__(self, persist_path: str, collection_name: str) -> None:
        self.persist_path = persist_path
        self.collection_name = collection_name

        self.client = chromadb.PersistentClient(path=persist_path)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB ready. path=%s collection=%s",
            self.persist_path,
            self.collection_name,
        )

    @staticmethod
    def _distance_to_similarity(distance: float | None) -> float:
        if distance is None:
            return 0.0
        return 1.0 / (1.0 + float(distance))

    @staticmethod
    def _sanitize_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
        allowed = (str, int, float, bool)
        sanitized: dict[str, Any] = {}
        for key, value in metadata.items():
            if isinstance(value, allowed):
                sanitized[key] = value
            elif value is not None:
                sanitized[key] = str(value)
        return sanitized

    def upsert_knowledge(
        self,
        doc_id: str,
        question: str,
        answer: str,
        embedding: list[float],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        metadata = self._sanitize_metadata(metadata or {})
        metadata.update({"question": question})
        document = f"Question: {question}\nAnswer: {answer}"

        self.collection.upsert(
            ids=[doc_id],
            documents=[document],
            metadatas=[metadata],
            embeddings=[embedding],
        )

    def query_similar(
        self,
        embedding: list[float],
        top_k: int = 3,
    ) -> tuple[list[str], list[float], list[dict[str, Any]]]:
        current_count = self.collection.count()
        if current_count == 0:
            return [], [], []

        n_results = min(top_k, current_count)
        result = self.collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

        documents = (result.get("documents") or [[]])[0]
        metadatas = (result.get("metadatas") or [[]])[0]
        distances = (result.get("distances") or [[]])[0]
        scores = [self._distance_to_similarity(distance) for distance in distances]
        return documents, scores, metadatas

