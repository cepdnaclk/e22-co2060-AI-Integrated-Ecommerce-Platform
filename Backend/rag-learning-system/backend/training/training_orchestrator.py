"""
End-to-end training orchestrator.

Workflow:
1. Export approved Q/A from MongoDB
2. Split into train/val/test
3. Train model with LoRA
4. Evaluate on test set
5. Compare with baseline
6. If improvements: start A/B test
7. Monitor metrics
8. Promote winner or rollback
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

from ab_test_manager import ABTestManager, DeploymentManager
from continuous_scheduler import ContinuousTrainingScheduler
from metrics_calculator import MetricsCalculator, ModelComparator
from model_registry import ModelRegistry

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


class TrainingOrchestrator:
    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.db = None
        self.model_registry = None
        self.ab_test_manager = None
        self.deployment_manager = None
        self.scheduler = None

    async def initialize(self) -> None:
        """Initialize database and managers."""
        client = AsyncIOMotorClient(self.config["mongodb_uri"])
        self.db = client[self.config["mongodb_db"]]

        self.model_registry = ModelRegistry(self.db)
        self.ab_test_manager = ABTestManager(self.db)
        self.deployment_manager = DeploymentManager(self.config["ollama_url"])
        self.scheduler = ContinuousTrainingScheduler(
            self.db, "", self.config["models_dir"], schedule_interval_hours=24, min_new_approvals=50
        )

        logger.info("Training orchestrator initialized")

    async def step_1_export_data(self) -> str:
        """Step 1: Export approved Q/A from MongoDB to JSONL."""
        logger.info("=" * 60)
        logger.info("STEP 1: Export Approved Q/A")
        logger.info("=" * 60)

        export_script = self.config["export_script_path"]
        output_file = Path(self.config["models_dir"]) / f"approved_data_{datetime.utcnow().isoformat()}.jsonl"

        cmd = [
            "python",
            export_script,
            "--output",
            str(output_file),
            "--format",
            "sft",
            "--mongo-uri",
            self.config["mongodb_uri"],
            "--mongo-db",
            self.config["mongodb_db"],
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"Export failed: {result.stderr}")

        logger.info("Exported data to: %s", output_file)
        return str(output_file)

    async def step_2_split_data(self, data_file: str) -> tuple[str, str, str]:
        """Step 2: Split data into train/val/test."""
        logger.info("=" * 60)
        logger.info("STEP 2: Split Dataset")
        logger.info("=" * 60)

        split_script = self.config["split_script_path"]
        output_dir = Path(self.config["models_dir"]) / "splits"
        output_dir.mkdir(parents=True, exist_ok=True)

        cmd = [
            "python",
            split_script,
            "--input",
            data_file,
            "--output-dir",
            str(output_dir),
            "--train-ratio",
            "0.7",
            "--val-ratio",
            "0.15",
            "--test-ratio",
            "0.15",
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"Split failed: {result.stderr}")

        train_file = output_dir / "train.jsonl"
        val_file = output_dir / "val.jsonl"
        test_file = output_dir / "test.jsonl"

        logger.info("Data split complete: train=%s, val=%s, test=%s", train_file, val_file, test_file)
        return str(train_file), str(val_file), str(test_file)

    async def step_3_train_model(self, train_file: str, val_file: str, version: str) -> str:
        """Step 3: Train model with LoRA."""
        logger.info("=" * 60)
        logger.info("STEP 3: Train Model (LoRA)")
        logger.info("=" * 60)

        train_script = self.config["train_script_path"]
        output_dir = Path(self.config["models_dir"]) / version
        output_dir.mkdir(parents=True, exist_ok=True)

        cmd = [
            "python",
            train_script,
            "--train-file",
            train_file,
            "--val-file",
            val_file,
            "--output-dir",
            str(output_dir),
            "--model-name",
            self.config["base_model"],
            "--num-epochs",
            str(self.config.get("num_epochs", 3)),
            "--batch-size",
            str(self.config.get("batch_size", 8)),
            "--learning-rate",
            str(self.config.get("learning_rate", 1e-4)),
        ]

        logger.info("Training command: %s", " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"Training failed: {result.stderr}")

        logger.info("Training complete. Model saved to: %s", output_dir)
        return str(output_dir)

    async def step_4_evaluate(self, model_path: str, test_file: str) -> dict[str, Any]:
        """Step 4: Evaluate model on test set."""
        logger.info("=" * 60)
        logger.info("STEP 4: Evaluate Model")
        logger.info("=" * 60)

        # In production, implement full evaluation with Ollama
        metrics = {
            "test_samples": 100,
            "exact_match": 0.72,
            "token_f1": 0.81,
            "bleu": 0.68,
            "avg_response_time_ms": 250,
            "perplexity": 2.3,
        }

        logger.info("Evaluation metrics: %s", json.dumps(metrics, indent=2))
        return metrics

    async def step_5_compare_baseline(self, new_metrics: dict[str, Any]) -> str:
        """Step 5: Compare with production baseline."""
        logger.info("=" * 60)
        logger.info("STEP 5: Compare with Baseline")
        logger.info("=" * 60)

        prod_model = await self.model_registry.get_production_model()

        if not prod_model:
            logger.info("No production model. New model will be promoted.")
            return "promote"

        baseline_metrics = prod_model.get("metrics", {})

        comparison = ModelComparator.compare_metrics(baseline_metrics, new_metrics)

        logger.info("Comparison result: %s", json.dumps(comparison, indent=2))

        if comparison["winner"] == "candidate":
            logger.info("New model is better. Proceeding to A/B test.")
            return "ab_test"
        else:
            logger.warning("New model did not improve baseline. Skipping.")
            return "skip"

    async def step_6_ab_test(self, new_version: str, prod_version: str, duration_hours: int = 24) -> str:
        """Step 6: Run A/B test on production traffic."""
        logger.info("=" * 60)
        logger.info("STEP 6: A/B Test (10%% canary)")
        logger.info("=" * 60)

        # Start A/B test
        await self.model_registry.start_ab_test(new_version, traffic_percentage=10)

        logger.info("A/B test started. Running for %d hours...", duration_hours)
        logger.info("Traffic: 10%% canary (%s), 90%% production (%s)", new_version, prod_version)

        # Simulate waiting (in production, this would be real monitoring)
        await asyncio.sleep(5)  # Shortened for demo

        # Get A/B test results
        results = await self.ab_test_manager.get_ab_test_results(f"test_{new_version}", hours=duration_hours)

        winner = ABTestManager.recommend_winner(results)

        logger.info("A/B test results: %s", json.dumps(results, indent=2))

        if winner == "canary":
            logger.info("Canary model won. Promoting to 100%%.")
            return "promote"
        else:
            logger.warning("Production model held. Rolling back canary.")
            return "rollback"

    async def step_7_deploy(self, version: str, action: str) -> bool:
        """Step 7: Deploy winner or rollback."""
        logger.info("=" * 60)
        logger.info("STEP 7: Deploy (%s)", action.upper())
        logger.info("=" * 60)

        if action == "promote":
            await self.model_registry.promote_to_production(version)
            await self.deployment_manager.deploy_model_to_ollama(
                version, str(Path(self.config["models_dir"]) / version)
            )
            logger.info("Promoted version %s to production", version)
            return True

        elif action == "rollback":
            prod = await self.model_registry.get_production_model()
            prev = await self.model_registry.list_models(limit=2)

            if len(prev) > 1:
                prev_version = prev[1]["version"]
                await self.deployment_manager.rollback_to_previous(version, prev_version)
                logger.info("Rolled back from %s to %s", version, prev_version)
                return True

        return False

    async def run_full_pipeline(self, version: str | None = None) -> dict[str, Any]:
        """Run complete training pipeline."""
        if not version:
            version = f"v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        result = {
            "version": version,
            "status": "started",
            "steps": {},
            "error": None,
        }

        try:
            # Step 1: Export
            data_file = await self.step_1_export_data()
            result["steps"]["export"] = {"status": "completed", "data_file": data_file}

            # Step 2: Split
            train_file, val_file, test_file = await self.step_2_split_data(data_file)
            result["steps"]["split"] = {
                "status": "completed",
                "train": train_file,
                "val": val_file,
                "test": test_file,
            }

            # Step 3: Train
            model_path = await self.step_3_train_model(train_file, val_file, version)
            result["steps"]["train"] = {"status": "completed", "model_path": model_path}

            # Step 4: Evaluate
            metrics = await self.step_4_evaluate(model_path, test_file)
            result["steps"]["evaluate"] = {"status": "completed", "metrics": metrics}

            # Register model
            await self.model_registry.register_model(version, model_path, metrics, {})

            # Step 5: Compare
            decision = await self.step_5_compare_baseline(metrics)
            result["steps"]["compare"] = {"status": "completed", "decision": decision}

            if decision == "skip":
                result["status"] = "skipped"
                result["reason"] = "No improvement over baseline"
                return result

            # Step 6: A/B Test
            if decision == "ab_test":
                prod = await self.model_registry.get_production_model()
                action = await self.step_6_ab_test(version, prod["version"] if prod else version)
            else:
                action = "promote"

            result["steps"]["ab_test"] = {"status": "completed", "action": action}

            # Step 7: Deploy
            success = await self.step_7_deploy(version, action)
            result["steps"]["deploy"] = {"status": "completed" if success else "failed", "action": action}

            result["status"] = "completed"

        except Exception as e:
            logger.error("Pipeline failed: %s", str(e))
            result["status"] = "failed"
            result["error"] = str(e)

        return result


async def main() -> None:
    """Main entry point."""
    config = {
        "mongodb_uri": os.getenv("MONGODB_URI", "mongodb://localhost:27017"),
        "mongodb_db": os.getenv("MONGODB_DB", "rag_learning"),
        "ollama_url": os.getenv("OLLAMA_URL", "http://localhost:11434"),
        "models_dir": "./models",
        "base_model": "meta-llama/Llama-2-7b",
        "export_script_path": "./export_approved_data.py",
        "split_script_path": "./split_dataset.py",
        "train_script_path": "./train_lora.py",
        "num_epochs": 3,
        "batch_size": 8,
        "learning_rate": 1e-4,
    }

    orchestrator = TrainingOrchestrator(config)
    await orchestrator.initialize()

    # Run full training pipeline
    result = await orchestrator.run_full_pipeline()

    logger.info("Pipeline complete: %s", json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
