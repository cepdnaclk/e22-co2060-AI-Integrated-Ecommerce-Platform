from __future__ import annotations

import os
import pickle
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

import networkx as nx

from .weight_calculator import combined_weight, jaccard_similarity

GRAPH_PATH = Path(__file__).resolve().parent / "product_graph.gpickle"
MAX_ATTRIBUTE_NEIGHBORS = int(os.getenv("RECOMMENDER_MAX_ATTRIBUTE_NEIGHBORS", "10"))


def _relation_label(co_count: int, attribute_sim: float) -> str:
    if co_count > 0 and attribute_sim > 0:
        return "both"
    if co_count > 0:
        return "co_purchase"
    return "attribute"


def _add_attribute_edges(
    graph: nx.Graph,
    products: List[Dict],
    product_map: Dict[str, Dict],
    has_any_co_purchase_data: bool,
) -> None:
    """Add attribute-only edges inside each category with top-k neighbors."""
    by_category: Dict[str, List[str]] = defaultdict(list)
    for p in products:
        by_category[str(p.get("category") or "").strip().lower()].append(str(p["_id"]))

    for _, ids in by_category.items():
        for pid in ids:
            scored_neighbors = []
            prod_a = product_map[pid]
            for other in ids:
                if other == pid:
                    continue
                if graph.has_edge(pid, other):
                    continue
                prod_b = product_map[other]
                attr_sim = jaccard_similarity(prod_a, prod_b)
                if attr_sim <= 0:
                    continue
                edge_weight = combined_weight(0, prod_a, prod_b, has_any_co_purchase_data)
                scored_neighbors.append((other, edge_weight, attr_sim))

            scored_neighbors.sort(key=lambda row: row[1])
            for other, edge_weight, attr_sim in scored_neighbors[:MAX_ATTRIBUTE_NEIGHBORS]:
                if graph.has_edge(pid, other):
                    continue
                graph.add_edge(
                    pid,
                    other,
                    weight=float(edge_weight),
                    co_purchase_count=0,
                    attribute_sim=float(round(attr_sim, 6)),
                    relationship_type="attribute",
                )


def build_graph(products: List[Dict], co_purchase: Dict[Tuple[str, str], int]) -> nx.Graph:
    graph = nx.Graph()
    product_map = {str(p["_id"]): p for p in products}
    has_any_co_purchase_data = len(co_purchase) > 0

    for p in products:
        graph.add_node(
            str(p["_id"]),
            productName=p.get("productName", ""),
            category=p.get("category", ""),
            brand=p.get("brand", ""),
            image=p.get("image", ""),
            minPrice=float(p.get("minPrice", 0.0) or 0.0),
            specs=p.get("specs", {}) or {},
            soldCount=int(p.get("soldCount", 0) or 0),
        )

    for (pid_a, pid_b), count in co_purchase.items():
        if pid_a not in product_map or pid_b not in product_map:
            continue
        prod_a = product_map[pid_a]
        prod_b = product_map[pid_b]
        attr_sim = jaccard_similarity(prod_a, prod_b)
        edge_weight = combined_weight(count, prod_a, prod_b, has_any_co_purchase_data)
        graph.add_edge(
            pid_a,
            pid_b,
            weight=float(edge_weight),
            co_purchase_count=int(count),
            attribute_sim=float(round(attr_sim, 6)),
            relationship_type=_relation_label(count, attr_sim),
        )

    _add_attribute_edges(graph, products, product_map, has_any_co_purchase_data)
    return graph


def save_graph(graph: nx.Graph, path: Path = GRAPH_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        pickle.dump(graph, f)


def load_graph(path: Path = GRAPH_PATH) -> nx.Graph:
    with path.open("rb") as f:
        return pickle.load(f)

