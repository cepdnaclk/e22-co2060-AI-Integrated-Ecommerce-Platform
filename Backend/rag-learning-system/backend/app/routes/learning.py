import logging

from fastapi import APIRouter, HTTPException, status

from app.models.learning_models import (
    KnowledgeListResponse,
    LearnRequest,
    LearnResponse,
)
from app.services.service_registry import learning_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["learning"])


@router.post("/learn", response_model=LearnResponse, status_code=status.HTTP_201_CREATED)
async def learn(request: LearnRequest) -> LearnResponse:
    try:
        knowledge_id = await learning_service.store_approved_knowledge(
            question=request.question,
            answer=request.answer,
            metadata=request.metadata,
        )
        return LearnResponse(
            message="Knowledge stored successfully",
            knowledge_id=knowledge_id,
        )
    except Exception as exc:
        logger.exception("Learning request failed.")
        raise HTTPException(status_code=500, detail=f"Learning failed: {exc}") from exc


@router.get("/knowledge", response_model=KnowledgeListResponse)
async def get_knowledge() -> KnowledgeListResponse:
    try:
        items = await learning_service.list_knowledge()
        return KnowledgeListResponse(count=len(items), items=items)
    except Exception as exc:
        logger.exception("Knowledge listing failed.")
        raise HTTPException(status_code=500, detail=f"Knowledge retrieval failed: {exc}") from exc

