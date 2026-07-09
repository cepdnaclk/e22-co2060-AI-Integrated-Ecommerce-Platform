from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ABTestManager:
    def __init__(self, db: Any = None) -> None:
        self.db = db
        self.collection = db["ab_tests"] if db else None

    async def route_request(
        self, user_id: str, production_model: str, canary_model: str, canary_percentage: float = 10
    ) -> tuple[str, str]:
        """Route a request to either production or canary model."""
        hash_val = int(hashlib.md5(f"{user_id}".encode()).hexdigest(), 16)
        route = hash_val % 100

        if route < canary_percentage:
            selected_model = canary_model
            variant = "canary"
        else:
            selected_model = production_model
            variant = "production"

        logger.debug("Routed user %s to %s variant", user_id, variant)
        return selected_model, variant

    async def log_request(self, user_id: str, variant: str, model: str, response_time: float, quality_score: float | None = None) -> None:
        """Log request for A/B test analysis."""
        if not self.collection:
            return

        doc = {
            "timestamp": datetime.utcnow(),
            "user_id": user_id,
            "variant": variant,
            "model": model,
            "response_time_ms": response_time,
            "quality_score": quality_score,
        }
        await self.collection.insert_one(doc)

    async def get_ab_test_results(self, test_id: str, hours: int = 24) -> dict[str, Any]:
        """Analyze A/B test results after N hours."""
        if not self.collection:
            return {}

        cutoff = datetime.utcnow()

        pipeline = [
            {
                "$match": {
                    "test_id": test_id,
                    "timestamp": {"$gte": datetime.utcfromtimestamp(cutoff.timestamp() - hours * 3600)},
                }
            },
            {
                "$group": {
                    "_id": "$variant",
                    "count": {"$sum": 1},
                    "avg_response_time": {"$avg": "$response_time_ms"},
                    "avg_quality_score": {"$avg": "$quality_score"},
                }
            },
        ]

        results = await self.collection.aggregate(pipeline).to_list(None)

        analysis = {
            "test_id": test_id,
            "hours_running": hours,
            "variants": {},
        }

        for result in results:
            variant = result["_id"]
            analysis["variants"][variant] = {
                "samples": result["count"],
                "avg_response_time_ms": result["avg_response_time"],
                "avg_quality_score": result["avg_quality_score"],
            }

        return analysis

    @staticmethod
    def recommend_winner(analysis: dict[str, Any]) -> str | None:
        """Recommend which variant should be promoted."""
        variants = analysis.get("variants", {})

        if len(variants) < 2:
            return None

        # Score by: lower response time + higher quality
        scores = {}
        for variant, metrics in variants.items():
            score = (
                -metrics.get("avg_response_time_ms", 0) * 0.3
                + metrics.get("avg_quality_score", 0) * 0.7
            )
            scores[variant] = score

        winner = max(scores, key=scores.get)
        logger.info("A/B test winner: %s (score: %.2f)", winner, scores[winner])
        return winner


class DeploymentManager:
    def __init__(self, ollama_url: str = "http://localhost:11434") -> None:
        self.ollama_url = ollama_url
        self.deployment_history = []

    async def deploy_model_to_ollama(self, model_name: str, model_path: str) -> bool:
        """Deploy a model to Ollama by pulling/loading it."""
        try:
            async with httpx.AsyncClient(timeout=300) as client:
                # Check if model is already loaded
                response = await client.post(f"{self.ollama_url}/api/pull", json={"name": model_name})

                if response.status_code == 200:
                    logger.info("Successfully deployed model %s to Ollama", model_name)
                    self.deployment_history.append(
                        {
                            "model": model_name,
                            "path": model_path,
                            "timestamp": datetime.utcnow(),
                            "status": "success",
                        }
                    )
                    return True
                else:
                    logger.error("Failed to deploy model: %s", response.text)
                    return False
        except Exception as e:
            logger.error("Error deploying model: %s", str(e))
            return False

    async def rollback_to_previous(self, current_model: str, previous_model: str) -> bool:
        """Rollback to previous model version."""
        try:
            success = await self.deploy_model_to_ollama(previous_model, "")

            if success:
                logger.warning("Rolled back from %s to %s", current_model, previous_model)
                self.deployment_history.append(
                    {
                        "from_model": current_model,
                        "to_model": previous_model,
                        "timestamp": datetime.utcnow(),
                        "status": "rollback",
                    }
                )
            return success
        except Exception as e:
            logger.error("Error during rollback: %s", str(e))
            return False

    async def health_check(self) -> bool:
        """Check if Ollama is healthy."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.ollama_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.error("Health check failed: %s", str(e))
            return False
