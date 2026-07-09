from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class ModelRegistry:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["model_versions"]

    async def register_model(
        self,
        version: str,
        model_path: str,
        metrics: dict[str, Any],
        training_config: dict[str, Any],
        status: str = "trained",
    ) -> str:
        """Register a newly trained model version."""
        doc = {
            "version": version,
            "model_path": model_path,
            "metrics": metrics,
            "training_config": training_config,
            "status": status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_production": False,
            "ab_test_traffic_percentage": 0,
        }
        result = await self.collection.insert_one(doc)
        logger.info("Registered model version: %s", version)
        return str(result.inserted_id)

    async def get_model(self, version: str) -> dict[str, Any] | None:
        """Fetch model metadata by version."""
        return await self.collection.find_one({"version": version})

    async def promote_to_production(self, version: str) -> None:
        """Promote a model version to production."""
        await self.collection.update_many({"is_production": True}, {"$set": {"is_production": False}})
        await self.collection.update_one({"version": version}, {"$set": {"is_production": True}})
        logger.info("Promoted model version to production: %s", version)

    async def get_production_model(self) -> dict[str, Any] | None:
        """Get current production model."""
        return await self.collection.find_one({"is_production": True})

    async def list_models(self, limit: int = 10) -> list[dict[str, Any]]:
        """List all model versions, sorted by creation date."""
        cursor = self.collection.find({}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def start_ab_test(self, version: str, traffic_percentage: int = 10) -> None:
        """Start A/B test for a model version."""
        await self.collection.update_one(
            {"version": version},
            {"$set": {"ab_test_traffic_percentage": traffic_percentage}},
        )
        logger.info("Started A/B test for version %s at %d%% traffic", version, traffic_percentage)

    async def stop_ab_test(self, version: str) -> None:
        """Stop A/B test for a model version."""
        await self.collection.update_one(
            {"version": version},
            {"$set": {"ab_test_traffic_percentage": 0}},
        )
        logger.info("Stopped A/B test for version %s", version)
