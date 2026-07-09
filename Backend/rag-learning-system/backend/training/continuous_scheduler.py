from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import aiofiles
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class ContinuousTrainingScheduler:
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        training_script_path: str,
        models_dir: str,
        schedule_interval_hours: int = 24,
        min_new_approvals: int = 50,
    ) -> None:
        self.db = db
        self.training_script = training_script_path
        self.models_dir = Path(models_dir)
        self.schedule_interval = timedelta(hours=schedule_interval_hours)
        self.min_new_approvals = min_new_approvals
        self.collection = db["training_jobs"]
        self.last_training_time = None
        self.is_running = False

    async def should_retrain_by_schedule(self) -> bool:
        """Check if enough time has passed since last training."""
        if self.last_training_time is None:
            return True

        elapsed = datetime.utcnow() - self.last_training_time
        should_train = elapsed >= self.schedule_interval

        if should_train:
            logger.info("Scheduled retraining triggered (interval: %s)", self.schedule_interval)
        return should_train

    async def should_retrain_by_data(self) -> bool:
        """Check if enough new approved Q/A has been added."""
        # Get count of approvals since last training
        last_job = await self.collection.find_one({"status": "completed"}, sort=[("completed_at", -1)])

        if not last_job:
            return True

        last_training = last_job.get("completed_at", datetime.utcfromtimestamp(0))

        approvals_collection = self.db["approved_qa"]
        new_count = await approvals_collection.count_documents({"created_at": {"$gt": last_training}})

        if new_count >= self.min_new_approvals:
            logger.info("Data-driven retraining triggered (%d new approvals)", new_count)
            return True

        return False

    async def should_retrain_by_performance(self) -> bool:
        """Check if production model performance has degraded."""
        metrics_collection = self.db["production_metrics"]

        # Get last 100 inference metrics
        recent_metrics = await metrics_collection.find({}).sort("timestamp", -1).limit(100).to_list(length=100)

        if len(recent_metrics) < 30:
            return False

        # Calculate average quality score
        avg_quality = sum(m.get("quality_score", 0) for m in recent_metrics) / len(recent_metrics)

        # Get last training's baseline
        last_job = await self.collection.find_one({"status": "completed"}, sort=[("completed_at", -1)])

        if not last_job:
            return False

        baseline_quality = last_job.get("metrics", {}).get("validation_quality_score", 100)

        # Retrain if degraded by >5%
        degradation = (baseline_quality - avg_quality) / baseline_quality * 100

        if degradation > 5:
            logger.warning("Performance degradation detected: %.2f%%, triggering retraining", degradation)
            return True

        return False

    async def start_training_job(self, trigger_reason: str) -> str:
        """Create and start a new training job."""
        job = {
            "job_id": f"train-{datetime.utcnow().isoformat()}",
            "triggered_by": trigger_reason,
            "status": "queued",
            "created_at": datetime.utcnow(),
            "started_at": None,
            "completed_at": None,
            "metrics": {},
            "error": None,
        }

        result = await self.collection.insert_one(job)
        logger.info("Started training job: %s (reason: %s)", job["job_id"], trigger_reason)

        return job["job_id"]

    async def mark_training_complete(self, job_id: str, metrics: dict[str, Any]) -> None:
        """Mark training job as complete."""
        await self.collection.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "metrics": metrics,
                }
            },
        )
        self.last_training_time = datetime.utcnow()
        logger.info("Training job completed: %s", job_id)

    async def mark_training_failed(self, job_id: str, error: str) -> None:
        """Mark training job as failed."""
        await self.collection.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "completed_at": datetime.utcnow(),
                    "error": error,
                }
            },
        )
        logger.error("Training job failed: %s - %s", job_id, error)

    async def get_training_history(self, limit: int = 10) -> list[dict[str, Any]]:
        """Get recent training jobs."""
        cursor = self.collection.find({}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def run_scheduler(self) -> None:
        """Main scheduler loop - runs continuously."""
        self.is_running = True
        logger.info("Starting continuous training scheduler")

        while self.is_running:
            try:
                # Check all retraining triggers
                retrain_schedule = await self.should_retrain_by_schedule()
                retrain_data = await self.should_retrain_by_data()
                retrain_perf = await self.should_retrain_by_performance()

                trigger_reason = None
                if retrain_schedule:
                    trigger_reason = "scheduled"
                elif retrain_data:
                    trigger_reason = "data_driven"
                elif retrain_perf:
                    trigger_reason = "performance_degradation"

                if trigger_reason:
                    job_id = await self.start_training_job(trigger_reason)
                    # Execute training (would call training_orchestrator.run())
                    logger.info("Would execute training job: %s", job_id)

                # Check every 30 minutes
                await asyncio.sleep(30 * 60)

            except Exception as e:
                logger.error("Error in training scheduler: %s", str(e))
                await asyncio.sleep(60)

    def stop_scheduler(self) -> None:
        """Stop the scheduler."""
        self.is_running = False
        logger.info("Stopping continuous training scheduler")
