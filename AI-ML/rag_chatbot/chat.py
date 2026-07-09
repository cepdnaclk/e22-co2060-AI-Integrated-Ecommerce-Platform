from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import List

import chromadb
from dotenv import load_dotenv
from nomic import embed, login
from openai import OpenAI


def build_prompt(context_chunks: List[str], question: str) -> str:
    context = "\n\n---\n\n".join(context_chunks)
    return (
        "You are a helpful assistant answering only from the provided context.\n"
        "If the answer is not in context, say: 'I could not find that in the knowledge base.'\n\n"
        f"Context:\n{context}\n\n"
        f"Question:\n{question}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Interactive RAG chatbot (DeepSeek, Gemini, or Ollama + Nomic + Chroma).")
    parser.add_argument("--db-dir", type=Path, default=Path("chroma_db"))
    parser.add_argument("--collection", default="chatbot_knowledge")
    parser.add_argument("--top-k", type=int, default=4)
    parser.add_argument("--embedding-model", default=os.getenv("NOMIC_EMBED_MODEL", "nomic-embed-text-v1.5"))
    parser.add_argument("--llm-model", default=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"))
    parser.add_argument("--max-tokens", type=int, default=450)
    args = parser.parse_args()

    load_dotenv()
    provider = os.getenv("LLM_PROVIDER", "deepseek").strip().lower()
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
    nomic_api_key = os.getenv("NOMIC_API_KEY")
    deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_model = os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash")
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
    ollama_api_key = os.getenv("OLLAMA_API_KEY", "ollama")

    if not nomic_api_key:
        raise EnvironmentError("NOMIC_API_KEY is missing. Set it in your environment or .env file.")
    if args.top_k < 1:
        raise ValueError("top-k must be >= 1.")

    login(nomic_api_key)
    client = chromadb.PersistentClient(path=str(args.db_dir.resolve()))
    collection = client.get_collection(args.collection)

    if provider == "gemini":
        if not gemini_api_key:
            raise EnvironmentError("GEMINI_API_KEY is missing. Set it in your environment or .env file.")
        if not gemini_model.startswith("models/"):
            gemini_model = f"models/{gemini_model}"
        import google.generativeai as genai

        genai.configure(api_key=gemini_api_key)
        gemini_client = genai.GenerativeModel(
            model_name=gemini_model,
            system_instruction="Answer clearly and concisely.",
        )
    elif provider == "ollama":
        llm = OpenAI(api_key=ollama_api_key, base_url=ollama_base_url)
    else:
        if not deepseek_api_key:
            raise EnvironmentError("DEEPSEEK_API_KEY is missing. Set it in your environment or .env file.")
        llm = OpenAI(api_key=deepseek_api_key, base_url=deepseek_base_url)

    print("RAG chatbot ready. Type 'exit' to quit.")
    while True:
        question = input("\nYou: ").strip()
        if not question:
            continue
        if question.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        query_embedding = embed.text(
            texts=[question],
            model=args.embedding_model,
            task_type="search_query",
        )["embeddings"][0]

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=args.top_k,
            include=["documents", "metadatas", "distances"],
        )

        docs = results["documents"][0]
        metadatas = results["metadatas"][0]
        if not docs:
            print("Assistant: I could not find that in the knowledge base.")
            continue

        prompt = build_prompt(docs, question)
        if provider == "gemini":
            response = gemini_client.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": args.max_tokens,
                },
            )
            answer = response.text or ""
        elif provider == "ollama":
            completion = llm.chat.completions.create(
                model=ollama_model,
                messages=[
                    {"role": "system", "content": "Answer clearly and concisely."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=args.max_tokens,
            )
            answer = completion.choices[0].message.content or ""
        else:
            completion = llm.chat.completions.create(
                model=args.llm_model,
                messages=[
                    {"role": "system", "content": "Answer clearly and concisely."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=args.max_tokens,
            )
            answer = completion.choices[0].message.content or ""
        print(f"Assistant: {answer.strip()}")
        sources = sorted({m["source"] for m in metadatas if m and "source" in m})
        if sources:
            print(f"Sources: {', '.join(sources)}")


if __name__ == "__main__":
    main()
