from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "RAG Learning System"
    app_env: str = "development"
    log_level: str = "INFO"

    mongo_uri: str = Field(default="mongodb://mongodb:27017")
    mongo_db_name: str = Field(default="rag_learning")
    mongo_collection_name: str = Field(default="approved_knowledge")

    chroma_path: str = Field(default="./chroma_db")
    chroma_collection_name: str = Field(default="shopping_knowledge")
    top_k: int = Field(default=3, ge=1, le=10)

    embedding_model: str = Field(default="all-MiniLM-L6-v2")

    ollama_base_url: str = Field(default="http://localhost:11434/api/chat")
    ollama_model: str = Field(default="llama3")
    ollama_timeout_seconds: int = Field(default=120, ge=10, le=600)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

