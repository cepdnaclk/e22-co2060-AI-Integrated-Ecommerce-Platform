from __future__ import annotations

import logging
import time
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .dijkstra_recommender import get_recommendations, get_shortest_path
from .graph_cache import force_rebuild, get_graph, get_stats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recommend", tags=["Product Recommendations"])


class RecommendedProduct(BaseModel):
    productId: str
    productName: str
    image: str
    category: str
    minPrice: float
    dissimilarityScore: float
    relationshipType: str


class RecommendationResponse(BaseModel):
    sourceProductId: str
    recommendations: List[RecommendedProduct]
    totalFound: int
    graphStats: Dict
    processingTimeMs: float


class PathResponse(BaseModel):
    sourceProductId: str
    targetProductId: str
    path: List[str]
    totalDistance: float
    hops: int


@router.get("/{product_id}", response_model=RecommendationResponse)
async def recommend(product_id: str, top_n: int = Query(8, ge=1, le=20)) -> RecommendationResponse:
    start = time.perf_counter()
    graph = get_graph()
    if product_id not in graph:
        return RecommendationResponse(
            sourceProductId=product_id,
            recommendations=[],
            totalFound=0,
            graphStats=get_stats(),
            processingTimeMs=round((time.perf_counter() - start) * 1000, 2),
        )

    recs = get_recommendations(graph, product_id, top_n=top_n)
    return RecommendationResponse(
        sourceProductId=product_id,
        recommendations=[RecommendedProduct(**r) for r in recs],
        totalFound=len(recs),
        graphStats=get_stats(),
        processingTimeMs=round((time.perf_counter() - start) * 1000, 2),
    )


@router.get("/{product_id}/path/{target_id}", response_model=PathResponse)
async def shortest_path(product_id: str, target_id: str) -> PathResponse:
    graph = get_graph()
    if product_id not in graph or target_id not in graph:
        raise HTTPException(status_code=404, detail="Source or target product not found in graph.")
    data = get_shortest_path(graph, product_id, target_id)
    return PathResponse(
        sourceProductId=product_id,
        targetProductId=target_id,
        path=data["path"],
        totalDistance=data["totalDistance"],
        hops=data["hops"],
    )


@router.post("/graph/rebuild")
async def rebuild_graph() -> Dict:
    graph = force_rebuild()
    stats = get_stats()
    logger.info("Recommendation graph rebuilt: nodes=%s edges=%s", graph.number_of_nodes(), graph.number_of_edges())
    return {"message": "Graph rebuilt successfully.", **stats}


@router.get("/graph/stats")
async def graph_stats() -> Dict:
    return get_stats()


def warmup_graph_cache() -> None:
    """Best-effort graph warmup for FastAPI startup."""
    get_graph()

