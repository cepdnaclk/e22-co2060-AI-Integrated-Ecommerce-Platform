from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

logger = logging.getLogger(__name__)


class MetricsCalculator:
    @staticmethod
    def calculate_exact_match(predictions: list[str], references: list[str]) -> float:
        """Calculate exact match percentage."""
        matches = sum(1 for pred, ref in zip(predictions, references) if pred.strip().lower() == ref.strip().lower())
        return (matches / len(references)) * 100 if references else 0

    @staticmethod
    def calculate_token_f1(predictions: list[str], references: list[str]) -> float:
        """Calculate token-level F1 score."""
        scores = []
        for pred, ref in zip(predictions, references):
            pred_tokens = set(pred.lower().split())
            ref_tokens = set(ref.lower().split())

            if not ref_tokens:
                continue

            tp = len(pred_tokens & ref_tokens)
            fp = len(pred_tokens - ref_tokens)
            fn = len(ref_tokens - pred_tokens)

            if tp + fp + fn == 0:
                scores.append(1.0)
            else:
                precision = tp / (tp + fp) if (tp + fp) > 0 else 0
                recall = tp / (tp + fn) if (tp + fn) > 0 else 0
                f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
                scores.append(f1)

        return np.mean(scores) * 100 if scores else 0

    @staticmethod
    def calculate_bleu(predictions: list[str], references: list[str], max_n: int = 4) -> float:
        """
        Simple BLEU-like metric (n-gram precision).
        For production, use nltk.translate.bleu_score.
        """
        scores = []
        for pred, ref in zip(predictions, references):
            pred_tokens = pred.lower().split()
            ref_tokens = ref.lower().split()

            if not ref_tokens:
                continue

            # Calculate n-gram precision
            precisions = []
            for n in range(1, min(max_n + 1, len(ref_tokens) + 1)):
                pred_ngrams = set(
                    " ".join(pred_tokens[i : i + n]) for i in range(len(pred_tokens) - n + 1)
                )
                ref_ngrams = set(" ".join(ref_tokens[i : i + n]) for i in range(len(ref_tokens) - n + 1))

                if len(ref_ngrams) == 0:
                    precisions.append(0)
                else:
                    precision = len(pred_ngrams & ref_ngrams) / len(ref_ngrams)
                    precisions.append(precision)

            # Brevity penalty
            if len(pred_tokens) < len(ref_tokens):
                bp = np.exp(1 - len(ref_tokens) / len(pred_tokens)) if len(pred_tokens) > 0 else 0
            else:
                bp = 1.0

            score = bp * np.exp(np.mean(np.log(np.array(precisions) + 1e-10)))
            scores.append(score)

        return np.mean(scores) * 100 if scores else 0

    @staticmethod
    def calculate_length_ratio(predictions: list[str], references: list[str]) -> float:
        """Calculate average ratio of predicted vs reference length."""
        ratios = []
        for pred, ref in zip(predictions, references):
            if len(ref) > 0:
                ratio = len(pred) / len(ref)
                ratios.append(ratio)

        return np.mean(ratios) if ratios else 0

    @staticmethod
    def evaluate_model_output(
        predictions: list[str], references: list[str], metadata: dict[str, Any] | None = None
    ) -> dict[str, float]:
        """Calculate all evaluation metrics."""
        metrics = {
            "exact_match": MetricsCalculator.calculate_exact_match(predictions, references),
            "token_f1": MetricsCalculator.calculate_token_f1(predictions, references),
            "bleu": MetricsCalculator.calculate_bleu(predictions, references),
            "length_ratio": MetricsCalculator.calculate_length_ratio(predictions, references),
            "num_samples": len(predictions),
        }

        logger.info("Evaluation metrics: %s", json.dumps(metrics, indent=2))
        return metrics


class ModelComparator:
    @staticmethod
    def compare_metrics(baseline: dict[str, float], candidate: dict[str, float]) -> dict[str, Any]:
        """Compare two models' metrics and determine winner."""
        comparison = {
            "baseline": baseline,
            "candidate": candidate,
            "improvements": {},
            "regressions": {},
            "winner": None,
        }

        key_metrics = ["exact_match", "token_f1", "bleu"]

        for metric in key_metrics:
            if metric in baseline and metric in candidate:
                diff = candidate[metric] - baseline[metric]
                pct_change = (diff / baseline[metric] * 100) if baseline[metric] != 0 else 0

                if diff > 0:
                    comparison["improvements"][metric] = {
                        "delta": diff,
                        "pct_change": pct_change,
                    }
                elif diff < 0:
                    comparison["regressions"][metric] = {
                        "delta": diff,
                        "pct_change": pct_change,
                    }

        # Determine winner: minimize regressions in key metrics
        if comparison["regressions"]:
            comparison["winner"] = "baseline"
        elif comparison["improvements"]:
            comparison["winner"] = "candidate"
        else:
            comparison["winner"] = "tie"

        logger.info(
            "Model comparison: %s (improvements: %d, regressions: %d)",
            comparison["winner"],
            len(comparison["improvements"]),
            len(comparison["regressions"]),
        )
        return comparison
