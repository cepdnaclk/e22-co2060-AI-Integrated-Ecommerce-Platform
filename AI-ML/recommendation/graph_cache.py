from __future__ import annotations

import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

import networkx as nx

from .graph_builder import extract_data
from .product_graph import GRAPH_PATH, build_graph, load_graph, save_graph

REBUILD_INTERVAL_HOURS = int(os.getenv("RECOMMENDER_GRAPH_REBUILD_HOURS", "24"))

_graph_instance: Optional[nx.Graph] = None
_last_built: Optional[datetime] = None
_lock = threading.Lock()
_graph_file = Path(GRAPH_PATH)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_stale() -> bool:
    if _last_built is None:
        return True
    delta = _now() - _last_built
    return delta.total_seconds() > REBUILD_INTERVAL_HOURS * 3600


def _load_from_disk() -> Optional[nx.Graph]:
    if not _graph_file.exists():
        return None
    try:
        graph = load_graph(_graph_file)
        return graph
    except Exception:
        return None


def _rebuild() -> nx.Graph:
    products, co_purchase = extract_data()
    graph = build_graph(products, co_purchase)
    save_graph(graph, _graph_file)
    return graph


def get_graph() -> nx.Graph:
    global _graph_instance, _last_built
    with _lock:
        if _graph_instance is None:
            disk_graph = _load_from_disk()
            if disk_graph is not None:
                _graph_instance = disk_graph
                _last_built = _now()
            else:
                _graph_instance = _rebuild()
                _last_built = _now()
        elif _is_stale():
            _graph_instance = _rebuild()
            _last_built = _now()
        return _graph_instance


def force_rebuild() -> nx.Graph:
    global _graph_instance, _last_built
    with _lock:
        _graph_instance = _rebuild()
        _last_built = _now()
        return _graph_instance


def get_stats() -> Dict:
    graph = get_graph()
    return {
        "nodeCount": graph.number_of_nodes(),
        "edgeCount": graph.number_of_edges(),
        "lastBuilt": _last_built.isoformat() if _last_built else None,
    }

