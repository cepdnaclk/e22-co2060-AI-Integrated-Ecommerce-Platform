from __future__ import annotations

import logging

from app.services.chroma_service import ChromaService
from app.services.embedding_service import EmbeddingService
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(
        self,
        embedding_service: EmbeddingService,
        chroma_service: ChromaService,
        ollama_service: OllamaService,
        top_k: int = 3,
    ) -> None:
        self.embedding_service = embedding_service
        self.chroma_service = chroma_service
        self.ollama_service = ollama_service
        self.top_k = top_k

    def _build_prompt(self, question: str, contexts: list[str]) -> str:
        if contexts:
            context_block = "\n\n".join(
                f"[Context {idx + 1}]\n{context}" for idx, context in enumerate(contexts)
            )
        else:
            context_block = "No relevant approved knowledge found."

        return (
            "You are an AI shopping assistant.\n\n"
            "Use this knowledge:\n"
            f"{context_block}\n\n"
            "Answer this question:\n"
            f"{question}"
        )

    async def answer_question(self, message: str) -> dict:
        logger.info("RAG request received.")
        query_embedding = await self.embedding_service.embed_text(message)
        contexts, scores, _ = self.chroma_service.query_similar(
            embedding=query_embedding,
            top_k=self.top_k,
        )

        prompt = self._build_prompt(message, contexts)
        answer = await self.ollama_service.generate_response(
            prompt=prompt,
            system_message="Answer clearly, use retrieved knowledge first, and avoid hallucinations.",
        )

        return {
            "response": answer,
            "retrieved_context": contexts,
            "similarity_scores": scores,
        }

