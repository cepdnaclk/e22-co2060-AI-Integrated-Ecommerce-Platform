from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=2,
        max_length=2000,
        description="User question to answer with RAG.",
    )


class ChatResponse(BaseModel):
    response: str
    retrieved_context: list[str]
    similarity_scores: list[float]

