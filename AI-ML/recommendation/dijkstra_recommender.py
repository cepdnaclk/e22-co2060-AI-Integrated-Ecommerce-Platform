from __future__ import annotations

from typing import Dict, List

import networkx as nx


def _as_result(graph: nx.Graph, source: str, node_id: str, distance: float) -> Dict:
    attrs = graph.nodes[node_id]
    relationship = "similar_to"
    if graph.has_edge(source, node_id):
        relationship = graph.edges[source, node_id].get("relationship_type", "similar_to")
    return {
        "productId": node_id,
        "productName": attrs.get("productName", ""),
        "image": attrs.get("image", ""),
        "category": attrs.get("category", ""),
        "minPrice": float(attrs.get("minPrice", 0.0) or 0.0),
        "dissimilarityScore": round(float(distance), 4),
        "relationshipType": relationship,
    }


def fallback_by_category(graph: nx.Graph, product_id: str, top_n: int = 8) -> List[Dict]:
    if product_id not in graph:
        return []
    source_category = str(graph.nodes[product_id].get("category") or "")
    candidates = []
    for node_id, attrs in graph.nodes(data=True):
        if node_id == product_id:
            continue
        if str(attrs.get("category") or "") != source_category:
            continue
        sold = int(attrs.get("soldCount", 0) or 0)
        candidates.append((node_id, sold))

    candidates.sort(key=lambda item: item[1], reverse=True)
    results: List[Dict] = []
    for node_id, _ in candidates[:top_n]:
        results.append(_as_result(graph, product_id, node_id, 1.0))
    return results


def get_recommendations(
    graph: nx.Graph,
    product_id: str,
    top_n: int = 8,
    cutoff: float = 5.0,
) -> List[Dict]:
    if product_id not in graph:
        return []

    distances = nx.single_source_dijkstra_path_length(
        graph,
        source=product_id,
        cutoff=float(cutoff),
        weight="weight",
    )

    ranked = sorted(
        ((node_id, dist) for node_id, dist in distances.items() if node_id != product_id),
        key=lambda item: item[1],
    )
    results = [_as_result(graph, product_id, node_id, dist) for node_id, dist in ranked[:top_n]]
    if results:
        return results
    return fallback_by_category(graph, product_id, top_n)


def get_shortest_path(graph: nx.Graph, source: str, target: str) -> Dict:
    if source not in graph or target not in graph:
        return {"path": [], "totalDistance": 0.0, "hops": 0}

    path = nx.dijkstra_path(graph, source=source, target=target, weight="weight")
    distance = nx.dijkstra_path_length(graph, source=source, target=target, weight="weight")
    return {
        "path": path,
        "totalDistance": round(float(distance), 4),
        "hops": max(0, len(path) - 1),
    }

