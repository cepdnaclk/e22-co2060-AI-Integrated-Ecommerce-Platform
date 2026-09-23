from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from app.database.mongodb import get_database
from app.models.learning_models import KnowledgeItem
from app.services.chroma_service import ChromaService
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class LearningService:
    def __init__(
        self,
        embedding_service: EmbeddingService,
        chroma_service: ChromaService,
        collection_name: str,
    ) -> None:
        self.embedding_service = embedding_service
        self.chroma_service = chroma_service
        self.collection_name = collection_name

    def _collection(self):
        return get_database()[self.collection_name]

    async def ensure_indexes(self) -> None:
        collection = self._collection()
        await collection.create_index("question_lower")
        await collection.create_index("created_at")
        logger.info("Mongo indexes are ready for collection: %s", self.collection_name)

    async def store_approved_knowledge(
        self,
        question: str,
        answer: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        collection = self._collection()
        normalized_question = question.strip()
        normalized_answer = answer.strip()
        metadata = metadata or {}
        now = datetime.now(timezone.utc)
        question_lower = normalized_question.lower()

        existing = await collection.find_one({"question_lower": question_lower})
        if existing is not None:
            await collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "question": normalized_question,
                        "answer": normalized_answer,
                        "metadata": metadata,
                        "updated_at": now,
                    }
                },
            )
            knowledge_id = str(existing["_id"])
            logger.info("Updated approved knowledge: %s", knowledge_id)
        else:
            document = {
                "question": normalized_question,
                "question_lower": question_lower,
                "answer": normalized_answer,
                "metadata": metadata,
                "created_at": now,
                "updated_at": now,
            }
            insert_result = await collection.insert_one(document)
            knowledge_id = str(insert_result.inserted_id)
            logger.info("Stored new approved knowledge: %s", knowledge_id)

        embedding_text = f"Question: {normalized_question}\nAnswer: {normalized_answer}"
        embedding = await self.embedding_service.embed_text(embedding_text)

        self.chroma_service.upsert_knowledge(
            doc_id=knowledge_id,
            question=normalized_question,
            answer=normalized_answer,
            embedding=embedding,
            metadata={"knowledge_id": knowledge_id, **metadata},
        )

        return knowledge_id

    async def list_knowledge(self) -> list[KnowledgeItem]:
        collection = self._collection()
        cursor = collection.find({}).sort("created_at", -1)

        results: list[KnowledgeItem] = []
        async for item in cursor:
            results.append(
                KnowledgeItem(
                    id=str(item["_id"]),
                    question=item["question"],
                    answer=item["answer"],
                    metadata=item.get("metadata", {}),
                    created_at=item["created_at"],
                    updated_at=item["updated_at"],
                )
            )
        return results

