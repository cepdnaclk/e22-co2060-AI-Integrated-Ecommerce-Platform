from app.config import get_settings
from app.services.chroma_service import ChromaService
from app.services.embedding_service import EmbeddingService
from app.services.learning_service import LearningService
from app.services.ollama_service import OllamaService
from app.services.rag_service import RAGService

settings = get_settings()

embedding_service = EmbeddingService(model_name=settings.embedding_model)
chroma_service = ChromaService(
    persist_path=settings.chroma_path,
    collection_name=settings.chroma_collection_name,
)
ollama_service = OllamaService(
    base_url=settings.ollama_base_url,
    model=settings.ollama_model,
    timeout_seconds=settings.ollama_timeout_seconds,
)
rag_service = RAGService(
    embedding_service=embedding_service,
    chroma_service=chroma_service,
    ollama_service=ollama_service,
    top_k=settings.top_k,
)
learning_service = LearningService(
    embedding_service=embedding_service,
    chroma_service=chroma_service,
    collection_name=settings.mongo_collection_name,
)

