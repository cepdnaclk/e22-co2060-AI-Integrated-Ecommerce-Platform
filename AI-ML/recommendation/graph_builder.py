from __future__ import annotations

import os
from collections import defaultdict
from itertools import combinations
from typing import DefaultDict, Dict, List, Tuple

from pymongo import MongoClient


def _get_client() -> MongoClient:
    mongo_uri = os.getenv("RECOMMENDER_MONGO_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    return MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)


def _get_db_name() -> str:
    return os.getenv("RECOMMENDER_DB_NAME") or os.getenv("MONGO_DB_NAME") or "test"


def _to_str(value) -> str:
    return str(value) if value is not None else ""


def _fetch_min_prices(db) -> Dict[str, float]:
    offers = db["selleroffers"]
    pipeline = [
        {"$match": {"isActive": True, "price": {"$type": "number"}}},
        {"$group": {"_id": "$productId", "minPrice": {"$min": "$price"}}},
    ]
    min_prices: Dict[str, float] = {}
    for row in offers.aggregate(pipeline):
        min_prices[_to_str(row.get("_id"))] = float(row.get("minPrice", 0.0) or 0.0)
    return min_prices


def extract_data() -> Tuple[List[Dict], Dict[Tuple[str, str], int]]:
    """
    Extract products + co-purchase frequency map.
    Orders expected schema:
      { status, items: [{ productId, ...}, ...] }
    """
    client = _get_client()
    db = client[_get_db_name()]

    products_col = db["products"]
    orders_col = db["orders"]

    min_prices = _fetch_min_prices(db)
    products: List[Dict] = []
    cursor = products_col.find(
        {},
        {
            "productName": 1,
            "category": 1,
            "brand": 1,
            "image": 1,
            "specs": 1,
            "howManyProductsSold": 1,
        },
    )
    for p in cursor:
        pid = _to_str(p.get("_id"))
        products.append(
            {
                "_id": pid,
                "productName": p.get("productName", ""),
                "category": p.get("category", ""),
                "brand": p.get("brand", ""),
                "image": p.get("image", ""),
                "specs": p.get("specs", {}) or {},
                "soldCount": int(p.get("howManyProductsSold", 0) or 0),
                "minPrice": float(min_prices.get(pid, 0.0)),
            }
        )

    co_purchase: DefaultDict[Tuple[str, str], int] = defaultdict(int)
    order_cursor = orders_col.find(
        {"status": {"$in": ["confirmed", "delivered"]}},
        {"items.productId": 1},
    )
    for order in order_cursor:
        items = order.get("items") or []
        product_ids = sorted(
            {
                _to_str(item.get("productId"))
                for item in items
                if item.get("productId") is not None
            }
        )
        for pair in combinations(product_ids, 2):
            co_purchase[pair] += 1

    client.close()
    return products, dict(co_purchase)

