from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import List

import chromadb
from dotenv import load_dotenv
from nomic import embed, login

SUPPORTED_EXTENSIONS = {".txt", ".md"}

def load_mongo_products(uri: str) -> List[tuple[str, str]]:
    documents: List[tuple[str, str]] = []
    try:
        from pymongo import MongoClient
        client = MongoClient(uri)
        db = client.get_database()
        products_collection = db["products"]
        products = products_collection.find({})
        
        for p in products:
            product_name = p.get("productName", "Unknown Product")
            category = p.get("category", "Unknown Category")
            brand = p.get("brand", "Unknown Brand")
            description = p.get("description", "")
            specs = p.get("specs", {})
            
            text_parts = [
                f"Product: {product_name}",
                f"Brand: {brand}",
                f"Category: {category}"
            ]
            if description:
                text_parts.append(f"Description: {description}")
            if specs and isinstance(specs, dict):
                specs_str = ", ".join(f"{k}: {v}" for k, v in specs.items())
                text_parts.append(f"Specifications: {specs_str}")
                
            text = "\n".join(text_parts)
            source = f"mongodb://products/{p['_id']}"
            documents.append((source, text))
            
        print(f"Loaded {len(documents)} products from MongoDB.")
    except Exception as e:
        print(f"Error connecting to MongoDB or fetching products: {e}")
        
    return documents


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size.")

    chunks: List[str] = []
    start = 0
    text = text.strip()
    if not text:
        return chunks

    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = end - chunk_overlap
    return chunks


def load_text_files(data_dir: Path) -> List[tuple[str, str]]:
    files = sorted(
        path for path in data_dir.rglob("*") if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )
    if not files:
        raise ValueError(
            f"No .txt or .md files found in {data_dir}. Add files first, then run ingest again."
        )

    documents: List[tuple[str, str]] = []
    for file_path in files:
        text = file_path.read_text(encoding="utf-8")
        if text.strip():
            source = str(file_path.relative_to(data_dir))
            documents.append((source, text))
    if not documents:
        raise ValueError(f"Files were found in {data_dir}, but all were empty.")
    return documents


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a Chroma vector DB using Nomic embeddings.")
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--db-dir", type=Path, default=Path("chroma_db"))
    parser.add_argument("--collection", default="chatbot_knowledge")
    parser.add_argument("--chunk-size", type=int, default=900)
    parser.add_argument("--chunk-overlap", type=int, default=150)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--embedding-model", default=os.getenv("NOMIC_EMBED_MODEL", "nomic-embed-text-v1.5"))
    parser.add_argument("--reset", action="store_true", help="Delete existing collection before ingestion.")
    parser.add_argument("--use-mongo", action="store_true", help="Fetch data from MongoDB using MONGO_URI.")
    args = parser.parse_args()

    load_dotenv()
    nomic_api_key = os.getenv("NOMIC_API_KEY")
    if not nomic_api_key:
        raise EnvironmentError("NOMIC_API_KEY is missing. Set it in your environment or .env file.")

    if args.batch_size < 1:
        raise ValueError("batch_size must be >= 1.")
    if args.chunk_size < 50:
        raise ValueError("chunk_size should be at least 50 characters.")

    login(nomic_api_key)
    data_dir = args.data_dir.resolve()
    db_dir = args.db_dir.resolve()
    db_dir.mkdir(parents=True, exist_ok=True)

    documents = []
    try:
        documents.extend(load_text_files(data_dir))
    except ValueError as e:
        if not args.use_mongo:
            raise e
        else:
            print(f"Skipping local files: {e}")

    if args.use_mongo:
        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            raise EnvironmentError("MONGO_URI is missing. Set it in your environment or .env file.")
        mongo_docs = load_mongo_products(mongo_uri)
        documents.extend(mongo_docs)

    if not documents:
        raise ValueError("No documents found from local files or MongoDB.")

    client = chromadb.PersistentClient(path=str(db_dir))
    if args.reset:
        existing = {collection.name for collection in client.list_collections()}
        if args.collection in existing:
            client.delete_collection(args.collection)

    collection = client.get_or_create_collection(name=args.collection, metadata={"hnsw:space": "cosine"})

    ids: List[str] = []
    chunk_texts: List[str] = []
    metadatas: List[dict] = []

    for source, text in documents:
        chunks = chunk_text(text, args.chunk_size, args.chunk_overlap)
        for chunk_index, chunk in enumerate(chunks):
            ids.append(f"{source}::chunk-{chunk_index}")
            chunk_texts.append(chunk)
            metadatas.append({"source": source, "chunk": chunk_index})

    if not chunk_texts:
        raise ValueError("No chunks produced from input files.")

    for index in range(0, len(chunk_texts), args.batch_size):
        docs_batch = chunk_texts[index : index + args.batch_size]
        ids_batch = ids[index : index + args.batch_size]
        metadata_batch = metadatas[index : index + args.batch_size]
        embeddings = embed.text(
            texts=docs_batch,
            model=args.embedding_model,
            task_type="search_document",
        )["embeddings"]

        collection.upsert(
            ids=ids_batch,
            documents=docs_batch,
            metadatas=metadata_batch,
            embeddings=embeddings,
        )

    print(f"Ingestion complete. Added/updated {len(chunk_texts)} chunks in '{args.collection}'.")
    print(f"Data dir: {data_dir}")
    print(f"DB dir:   {db_dir}")


if __name__ == "__main__":
    main()
