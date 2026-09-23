from __future__ import annotations

import os
from typing import Dict, Set

ALPHA = float(os.getenv("RECOMMENDER_ALPHA", "0.6"))
BETA = float(os.getenv("RECOMMENDER_BETA", "0.4"))


def build_feature_set(product: Dict) -> Set[str]:
    """Build a lightweight feature set for Jaccard similarity."""
    features: Set[str] = set()
    category = str(product.get("category") or "").strip().lower()
    brand = str(product.get("brand") or "").strip().lower()

    if category:
        features.add(f"category:{category}")
    if brand:
        features.add(f"brand:{brand}")

    specs = product.get("specs") or {}
    if isinstance(specs, dict):
        for key in specs.keys():
            key_str = str(key).strip().lower()
            if key_str:
                features.add(f"spec:{key_str}")
    return features


def jaccard_similarity(product_a: Dict, product_b: Dict) -> float:
    feats_a = build_feature_set(product_a)
    feats_b = build_feature_set(product_b)
    if not feats_a and not feats_b:
        return 0.0
    union = len(feats_a | feats_b)
    if union == 0:
        return 0.0
    intersection = len(feats_a & feats_b)
    return intersection / union


def co_purchase_weight(count: int, alpha: float = ALPHA) -> float:
    return alpha / (count + 1)


def attribute_weight(product_a: Dict, product_b: Dict, beta: float = BETA) -> float:
    similarity = jaccard_similarity(product_a, product_b)
    return beta * (1.0 - similarity)


def combined_weight(
    co_purchase_count: int,
    product_a: Dict,
    product_b: Dict,
    has_any_co_purchase_data: bool = True,
) -> float:
    """
    Combined dissimilarity score.
    Special case from plan:
      - when no co-purchase data exists at all, use attribute-only scoring.
    """
    if not has_any_co_purchase_data:
        return attribute_weight(product_a, product_b, beta=1.0)

    cp_component = co_purchase_weight(co_purchase_count) if co_purchase_count > 0 else 0.0
    attr_component = attribute_weight(product_a, product_b, beta=BETA)
    return cp_component + attr_component

