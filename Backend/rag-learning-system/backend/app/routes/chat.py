import logging

from fastapi import APIRouter, HTTPException

from app.models.chat_models import ChatRequest, ChatResponse
from app.services.service_registry import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        result = await rag_service.answer_question(request.message)
        return ChatResponse(**result)
    except Exception as exc:
        logger.exception("Chat request failed.")
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc

