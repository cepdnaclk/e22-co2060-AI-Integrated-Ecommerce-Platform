from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import List, Literal

import chromadb
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from nomic import embed, login
from openai import OpenAI
from pydantic import BaseModel, Field

from ingest import chunk_text, load_mongo_products, load_text_files


class ChatMessage(BaseModel):
    role: Literal["user", "model", "assistant"] = "user"
    text: str = Field(min_length=1)


class ChatRequest(BaseModel):
    currentMessage: str = Field(min_length=1)
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    sources: List[str] = Field(default_factory=list)
    provider: str


class ReindexRequest(BaseModel):
    reset: bool = True
    include_mongo: bool = True


class ReindexResponse(BaseModel):
    chunks_indexed: int
    collection_count: int


class RAGRuntime:
    def __init__(self) -> None:
        load_dotenv()
        self._lock = threading.Lock()

        base_dir = Path(__file__).resolve().parent
        self.data_dir = Path(os.getenv("RAG_DATA_DIR", str(base_dir / "data"))).resolve()
        self.db_dir = Path(os.getenv("RAG_DB_DIR", str(base_dir / "chroma_db"))).resolve()
        self.db_dir.mkdir(parents=True, exist_ok=True)

        self.collection_name = os.getenv("RAG_COLLECTION", "chatbot_knowledge")
        self.embedding_model = os.getenv("NOMIC_EMBED_MODEL", "nomic-embed-text-v1.5")
        self.chunk_size = int(os.getenv("RAG_CHUNK_SIZE", "900"))
        self.chunk_overlap = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
        self.batch_size = int(os.getenv("RAG_BATCH_SIZE", "64"))
        self.top_k = int(os.getenv("RAG_TOP_K", "4"))
        self.max_tokens = int(os.getenv("RAG_MAX_TOKENS", "450"))

        nomic_api_key = os.getenv("NOMIC_API_KEY")
        if not nomic_api_key:
            raise EnvironmentError("NOMIC_API_KEY is required for RAG embedding search.")
        login(nomic_api_key)

        self.chroma_client = chromadb.PersistentClient(path=str(self.db_dir))
        self.collection = self.chroma_client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        self.provider = os.getenv("LLM_PROVIDER", "deepseek").strip().lower()
        self.gemini_client = None
        self.llm_client = None
        self.llm_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self._configure_llm_provider()

    def _configure_llm_provider(self) -> None:
        if self.provider == "gemini":
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if not gemini_api_key:
                raise EnvironmentError("GEMINI_API_KEY is required when LLM_PROVIDER=gemini.")
            gemini_model = os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash")
            if not gemini_model.startswith("models/"):
                gemini_model = f"models/{gemini_model}"

            import google.generativeai as genai

            genai.configure(api_key=gemini_api_key)
            self.gemini_client = genai.GenerativeModel(
                model_name=gemini_model,
                system_instruction="Answer clearly, concisely, and cite known context limits.",
            )
            return

        if self.provider == "ollama":
            ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
            ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
            ollama_api_key = os.getenv("OLLAMA_API_KEY", "ollama")
            self.llm_model = ollama_model
            self.llm_client = OpenAI(api_key=ollama_api_key, base_url=ollama_base_url)
            return

        deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        if not deepseek_api_key:
            raise EnvironmentError("DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek.")
        deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        self.llm_client = OpenAI(api_key=deepseek_api_key, base_url=deepseek_base_url)

    def _load_documents(self, include_mongo: bool) -> List[tuple[str, str]]:
        documents: List[tuple[str, str]] = []
        local_error = None

        try:
            documents.extend(load_text_files(self.data_dir))
        except ValueError as err:
            local_error = str(err)

        if include_mongo:
            mongo_uri = os.getenv("MONGO_URI")
            if mongo_uri:
                documents.extend(load_mongo_products(mongo_uri))
            elif not documents:
                raise ValueError("No local docs and MONGO_URI is not set.")

        if not documents:
            if local_error:
                raise ValueError(local_error)
            raise ValueError("No documents found for ingestion.")

        return documents

    def reindex(self, reset: bool = True, include_mongo: bool = True) -> tuple[int, int]:
        with self._lock:
            if reset:
                names = {collection.name for collection in self.chroma_client.list_collections()}
                if self.collection_name in names:
                    self.chroma_client.delete_collection(self.collection_name)
                self.collection = self.chroma_client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={"hnsw:space": "cosine"},
                )

            documents = self._load_documents(include_mongo=include_mongo)
            ids: List[str] = []
            chunk_texts: List[str] = []
            metadatas: List[dict] = []

            for source, text in documents:
                chunks = chunk_text(text, self.chunk_size, self.chunk_overlap)
                for chunk_index, chunk in enumerate(chunks):
                    ids.append(f"{source}::chunk-{chunk_index}")
                    chunk_texts.append(chunk)
                    metadatas.append({"source": source, "chunk": chunk_index})

            if not chunk_texts:
                raise ValueError("No chunks produced from loaded documents.")

            for index in range(0, len(chunk_texts), self.batch_size):
                docs_batch = chunk_texts[index : index + self.batch_size]
                ids_batch = ids[index : index + self.batch_size]
                metadata_batch = metadatas[index : index + self.batch_size]
                embeddings = embed.text(
                    texts=docs_batch,
                    model=self.embedding_model,
                    task_type="search_document",
                )["embeddings"]

                self.collection.upsert(
                    ids=ids_batch,
                    documents=docs_batch,
                    metadatas=metadata_batch,
                    embeddings=embeddings,
                )

            return len(chunk_texts), self.collection.count()

    def ensure_index(self) -> None:
        if self.collection.count() > 0:
            return
        self.reindex(reset=False, include_mongo=True)

    @staticmethod
    def _normalize_history(history: List[ChatMessage]) -> List[ChatMessage]:
        normalized: List[ChatMessage] = []
        for message in history[-8:]:
            role = "model" if message.role == "assistant" else message.role
            normalized.append(ChatMessage(role=role, text=message.text.strip()))
        return normalized

    def _build_prompt(self, question: str, context_chunks: List[str], history: List[ChatMessage]) -> str:
        history_block = "\n".join(
            f"{'User' if msg.role == 'user' else 'Assistant'}: {msg.text}" for msg in history
        )
        context = "\n\n---\n\n".join(context_chunks)
        return (
            "You are the official Weather + E-Commerce assistant for I-Computers.\n"
            "Rules:\n"
            "1. Answer using only the context and recent conversation.\n"
            "2. If weather data is not in context, clearly say you do not have it.\n"
            "3. Keep the answer concise and practical.\n"
            "4. If relevant, tie weather advice to product recommendations from the context.\n\n"
            f"Conversation so far:\n{history_block or '(no previous conversation)'}\n\n"
            f"Context:\n{context}\n\n"
            f"User question:\n{question}\n"
        )

    def _generate_answer(self, prompt: str) -> str:
        if self.provider == "gemini":
            response = self.gemini_client.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": self.max_tokens,
                },
            )
            return (response.text or "").strip()

        completion = self.llm_client.chat.completions.create(
            model=self.llm_model,
            messages=[
                {"role": "system", "content": "Answer clearly and concisely."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=self.max_tokens,
        )
        return (completion.choices[0].message.content or "").strip()

    def chat(self, current_message: str, history: List[ChatMessage]) -> dict:
        self.ensure_index()
        normalized_history = self._normalize_history(history)

        query_embedding = embed.text(
            texts=[current_message],
            model=self.embedding_model,
            task_type="search_query",
        )["embeddings"][0]

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=self.top_k,
            include=["documents", "metadatas", "distances"],
        )
        docs = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        sources = sorted({m["source"] for m in metadatas if m and "source" in m})

        if not docs:
            return {
                "reply": "I could not find that in the knowledge base.",
                "sources": [],
                "provider": self.provider,
            }

        prompt = self._build_prompt(
            question=current_message,
            context_chunks=docs,
            history=normalized_history,
        )
        answer = self._generate_answer(prompt)
        if not answer:
            answer = "I could not generate a response from the current context."

        return {
            "reply": answer,
            "sources": sources,
            "provider": self.provider,
        }


runtime = RAGRuntime()
app = FastAPI(title="I-Computers Weather RAG Service", version="1.0.0")


@app.get("/health")
def health() -> dict:
    try:
        collection_count = runtime.collection.count()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "ok",
        "provider": runtime.provider,
        "collection": runtime.collection_name,
        "collection_count": collection_count,
        "db_dir": str(runtime.db_dir),
        "mongo_linked": bool(os.getenv("MONGO_URI")),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    question = payload.currentMessage.strip()
    if not question:
        raise HTTPException(status_code=400, detail="currentMessage is required.")

    try:
        result = runtime.chat(current_message=question, history=payload.history)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {exc}") from exc

    return ChatResponse(
        reply=result["reply"],
        sources=result.get("sources", []),
        provider=result.get("provider", runtime.provider),
    )


@app.post("/reindex", response_model=ReindexResponse)
def reindex(payload: ReindexRequest) -> ReindexResponse:
    try:
        chunks, count = runtime.reindex(
            reset=payload.reset,
            include_mongo=payload.include_mongo,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reindex failed: {exc}") from exc

    return ReindexResponse(chunks_indexed=chunks, collection_count=count)
