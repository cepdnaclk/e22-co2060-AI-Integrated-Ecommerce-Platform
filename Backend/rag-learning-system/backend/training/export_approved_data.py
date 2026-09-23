from __future__ import annotations

import argparse
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export approved Q/A from MongoDB for SFT training."
    )
    parser.add_argument(
        "--mongo-uri",
        default=os.getenv("MONGO_URI", "mongodb://localhost:27017"),
    )
    parser.add_argument(
        "--db-name",
        default=os.getenv("MONGO_DB_NAME", "rag_learning"),
    )
    parser.add_argument(
        "--collection",
        default=os.getenv("MONGO_COLLECTION_NAME", "approved_knowledge"),
    )
    parser.add_argument(
        "--output-dir",
        default="training_data",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional limit. 0 means export all.",
    )
    return parser.parse_args()


def _normalize_datetime(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    return None


async def run() -> None:
    load_dotenv()
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    raw_path = output_dir / "approved_knowledge_raw.jsonl"
    sft_path = output_dir / "approved_knowledge_sft_messages.jsonl"

    client = AsyncIOMotorClient(args.mongo_uri)
    try:
        collection = client[args.db_name][args.collection]
        cursor = collection.find({}).sort("created_at", 1)
        if args.limit > 0:
            cursor = cursor.limit(args.limit)

        count = 0
        with raw_path.open("w", encoding="utf-8") as raw_file, sft_path.open(
            "w", encoding="utf-8"
        ) as sft_file:
            async for item in cursor:
                question = str(item.get("question", "")).strip()
                answer = str(item.get("answer", "")).strip()
                if not question or not answer:
                    continue

                metadata = item.get("metadata", {})
                if not isinstance(metadata, dict):
                    metadata = {"raw_metadata": str(metadata)}

                record = {
                    "id": str(item.get("_id")),
                    "question": question,
                    "answer": answer,
                    "metadata": metadata,
                    "created_at": _normalize_datetime(item.get("created_at")),
                    "updated_at": _normalize_datetime(item.get("updated_at")),
                }
                raw_file.write(json.dumps(record, ensure_ascii=False) + "\n")

                sft_record = {
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an AI shopping assistant. "
                                "Give accurate and concise product advice."
                            ),
                        },
                        {"role": "user", "content": question},
                        {"role": "assistant", "content": answer},
                    ],
                    "metadata": metadata,
                }
                sft_file.write(json.dumps(sft_record, ensure_ascii=False) + "\n")
                count += 1

        print(f"Export complete. records={count}")
        print(f"Raw dataset: {raw_path}")
        print(f"SFT dataset: {sft_path}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(run())

