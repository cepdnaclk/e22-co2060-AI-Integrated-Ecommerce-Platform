"""
In-memory embedding cache — avoids repeated DB lookups.
Keyed by admin user ID string.
"""

import logging

logger = logging.getLogger("embedding_cache")

_cache = {}


def get(admin_id: str):
    return _cache.get(admin_id)


def put(admin_id: str, embedding: list) -> None:
    _cache[admin_id] = embedding
    logger.debug("Cached embedding for admin %s", admin_id)


def remove(admin_id: str) -> None:
    _cache.pop(admin_id, None)


def clear() -> None:
    _cache.clear()
    logger.info("Embedding cache cleared")
