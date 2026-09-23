from __future__ import annotations

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MongoDBManager:
    def __init__(self) -> None:
        self._client: AsyncIOMotorClient | None = None
        self._database: AsyncIOMotorDatabase | None = None

    async def connect(self, uri: str, db_name: str) -> None:
        logger.info("Connecting to MongoDB...")
        self._client = AsyncIOMotorClient(uri)
        self._database = self._client[db_name]
        await self._database.command("ping")
        logger.info("MongoDB connection established.")

    async def disconnect(self) -> None:
        if self._client is not None:
            self._client.close()
            logger.info("MongoDB connection closed.")
        self._client = None
        self._database = None

    def get_database(self) -> AsyncIOMotorDatabase:
        if self._database is None:
            raise RuntimeError("MongoDB is not connected.")
        return self._database


mongodb_manager = MongoDBManager()


def get_database() -> AsyncIOMotorDatabase:
    return mongodb_manager.get_database()

