from contextlib import asynccontextmanager

from fastapi import FastAPI

from recommendation.api import router as recommendation_router
from recommendation.api import warmup_graph_cache


@asynccontextmanager
async def lifespan(_app: FastAPI):
    warmup_graph_cache()
    yield


app = FastAPI(
    title="Recommendation Engine API",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(recommendation_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "recommendation-engine"}
