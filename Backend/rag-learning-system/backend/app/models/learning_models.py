from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LearnRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    answer: str = Field(..., min_length=2, max_length=4000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class LearnResponse(BaseModel):
    message: str
    knowledge_id: str


class KnowledgeItem(BaseModel):
    id: str
    question: str
    answer: str
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class KnowledgeListResponse(BaseModel):
    count: int
    items: list[KnowledgeItem]

