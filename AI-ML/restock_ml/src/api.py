"""
FastAPI deployment endpoint for the Restock Priority ML system.

Provides REST endpoints for single/batch scoring, weight management,
SHAP explainability, health checks, and feedback collection.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# ── Project config import ──
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (  # noqa: E402
    ALL_FEATURES,
    API_HOST,
    API_PORT,
    MODELS_DIR,
    PRIORITY_TIERS,
    RATE_LIMIT,
    REPORTS_DIR,
    SQLITE_DB,
)

try:
    from src.explain import ModelExplainer  # noqa: E402
    from src.scoring import PriorityScoreEngine  # noqa: E402
    from src.weights import FALLBACK_WEIGHTS, WeightEngine  # noqa: E402
except ImportError:
    from explain import ModelExplainer  # noqa: E402
    from scoring import PriorityScoreEngine  # noqa: E402
    from weights import FALLBACK_WEIGHTS, WeightEngine  # noqa: E402

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# ═══════════════════════════════════════════════════════════════════════════════
# SQLAlchemy – Feedback table
# ═══════════════════════════════════════════════════════════════════════════════

engine = create_engine(f"sqlite:///{SQLITE_DB}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Feedback(Base):
    """Stores actual restock outcomes for retraining."""

    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String, nullable=False, index=True)
    predicted_score = Column(Float, nullable=True)
    predicted_tier = Column(String, nullable=True)
    actual_outcome = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(bind=engine)

# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic v2 request / response schemas
# ═══════════════════════════════════════════════════════════════════════════════

PRIMARY_VARS = ["D", "S", "L", "P", "SC", "HC", "SR", "SE"]


class ExternalFactorsInput(BaseModel):
    """24 external factor values used for dynamic weight computation."""
    MV: float = Field(0.0, description="Market Volatility")
    CCR: float = Field(0.0, description="Consumer Confidence Rate")
    DFE: float = Field(0.0, description="Demand Forecast Error")
    WU: float = Field(0.0, description="Warehouse Utilisation")
    CFP: float = Field(0.0, description="Cash Flow Position")
    ITR: float = Field(0.1, description="Inventory Turnover Rate")
    SCDI: float = Field(0.0, description="Supply Chain Disruption Index")
    IDR: float = Field(0.0, description="Import Dependency Ratio")
    GRI: float = Field(0.0, description="Geopolitical Risk Index")
    CPP: float = Field(0.0, description="Competitor Price Pressure")
    PED: float = Field(0.0, description="Price Elasticity of Demand")
    IBG: float = Field(0.0, description="Industry Benchmark Gap")
    MCI: float = Field(0.0, description="Market Competition Intensity")
    CSC: float = Field(0.0, description="Customer Switching Cost")
    BLI: float = Field(0.0, description="Brand Loyalty Index")
    IR: float = Field(0.0, description="Inflation Rate")
    SCI: float = Field(0.0, description="Supply Cost Index")
    PPR: float = Field(0.0, description="Purchase Price Risk")
    SCR: float = Field(0.0, description="Supply Chain Resilience")
    GSCV: float = Field(0.0, description="Global Supply Chain Visibility")
    SFH: float = Field(0.0, description="Supplier Financial Health")
    SDCV: float = Field(0.0, description="Demand Coefficient of Variation")
    ISI: float = Field(0.0, description="Inventory Shrinkage Index")
    CEI: float = Field(0.0, description="Customer Experience Impact")


class SKUInput(BaseModel):
    """Single SKU input with 8 primary variables and optional external factors."""
    SKU_ID: str = Field(..., description="Unique SKU identifier")
    D: float = Field(..., description="Demand Rate")
    S: float = Field(..., description="Stock Level")
    L: float = Field(..., description="Lead Time")
    P: float = Field(..., description="Profit Margin")
    SC: float = Field(..., description="Stockout Cost")
    HC: float = Field(..., description="Holding Cost")
    SR: float = Field(..., description="Supplier Reliability")
    SE: float = Field(..., description="Seasonality Index")
    external_factors: Optional[ExternalFactorsInput] = None


class SingleScoreResponse(BaseModel):
    """Response for a single SKU scoring request."""
    sku_id: str
    priority_score: float
    tier: str
    action: str
    response_time: str
    variable_contributions: Dict[str, float]
    weights_used: Dict[str, float]
    shap_explanation: Optional[Dict[str, Any]] = None
    timestamp: str


class BatchScoreResponse(BaseModel):
    """Response for batch scoring request."""
    results: List[Dict[str, Any]]
    total: int
    timestamp: str


class WeightsResponse(BaseModel):
    """Current weight values response."""
    weights: Dict[str, float]
    external_factors: Optional[Dict[str, float]] = None
    timestamp: str


class WeightsRecalculateResponse(BaseModel):
    """Response after recalculating weights."""
    new_weights: Dict[str, float]
    previous_weights: Dict[str, float]
    comparison: Dict[str, float]
    timestamp: str


class FeedbackInput(BaseModel):
    """Feedback payload for a given SKU."""
    actual_outcome: str = Field(..., description="Actual restock outcome (e.g. 'restocked', 'not_needed')")
    predicted_score: Optional[float] = None
    predicted_tier: Optional[str] = None
    notes: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Confirmation after storing feedback."""
    sku_id: str
    feedback_id: int
    message: str
    timestamp: str


class HealthResponse(BaseModel):
    """API health check response."""
    status: str
    model_version: str
    models_loaded: bool
    scoring_mode: str
    timestamp: str


# ═══════════════════════════════════════════════════════════════════════════════
# In-memory rate limiter (token bucket)
# ═══════════════════════════════════════════════════════════════════════════════

class TokenBucket:
    """Simple in-memory token-bucket rate limiter."""

    def __init__(self, rate: int = RATE_LIMIT, per: float = 60.0) -> None:
        self.rate = rate
        self.per = per
        self.tokens: float = float(rate)
        self.last_refill: float = time.monotonic()

    def consume(self) -> bool:
        """Try to consume a token. Returns True if allowed."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(float(self.rate), self.tokens + elapsed * (self.rate / self.per))
        self.last_refill = now
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False


_rate_limiter = TokenBucket()

# ═══════════════════════════════════════════════════════════════════════════════
# Application state
# ═══════════════════════════════════════════════════════════════════════════════

_state: Dict[str, Any] = {
    "models": None,
    "models_loaded": False,
    "scoring_engine": PriorityScoreEngine(),
    "weight_engine": WeightEngine(),
    "explainer": ModelExplainer(),
    "current_weights": dict(FALLBACK_WEIGHTS),
    "current_external_factors": {},
    "model_version": "deterministic-v1",
    "scoring_mode": "deterministic",
}


def _load_ml_models() -> bool:
    """Attempt to load trained ML models from MODELS_DIR."""
    try:
        required_files = ["xgb.joblib", "lgbm.joblib", "mlp.pt", "meta_learner.joblib"]
        if not all((MODELS_DIR / f).exists() for f in required_files):
            logger.warning("Trained models not found in %s – using deterministic scoring.", MODELS_DIR)
            return False

        try:
            from src.train import RestockMLTrainer  # noqa: E402
        except ImportError:
            from train import RestockMLTrainer  # noqa: E402

        trainer = RestockMLTrainer()
        models = trainer.load_models(MODELS_DIR)
        _state["models"] = models
        _state["models_loaded"] = True
        _state["model_version"] = "ensemble-v1"
        _state["scoring_mode"] = "ensemble"
        logger.info("ML models loaded successfully from %s", MODELS_DIR)
        return True
    except Exception as exc:
        logger.error("Failed to load ML models: %s – falling back to deterministic.", exc)
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# Lifespan context manager
# ═══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup; clean up on shutdown."""
    logger.info("Starting Restock Priority ML API …")
    _load_ml_models()
    yield
    logger.info("Shutting down Restock Priority ML API.")


# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI app
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="Restock Priority ML API",
    description="AI-powered restock priority scoring with SHAP explainability.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/response logging & rate limiting middleware ──


@app.middleware("http")
async def logging_and_rate_limit_middleware(request: Request, call_next) -> Response:
    """Log requests/responses and enforce rate limiting."""
    if not _rate_limiter.consume():
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    start = time.monotonic()
    logger.info("→ %s %s", request.method, request.url.path)

    response: Response = await call_next(request)

    elapsed_ms = (time.monotonic() - start) * 1000
    logger.info("← %s %s %d (%.1fms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


# ═══════════════════════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_external_factors(ext: Optional[ExternalFactorsInput]) -> Dict[str, float]:
    """Convert Pydantic external factors model to a plain dict."""
    if ext is None:
        return {}
    return ext.model_dump()


def _score_single_deterministic(sku: SKUInput) -> Dict[str, Any]:
    """Score a single SKU using the deterministic formula."""
    ext_dict = _extract_external_factors(sku.external_factors)
    engine = _state["scoring_engine"]
    weight_engine = _state["weight_engine"]

    weights = weight_engine.compute_weights(ext_dict) if ext_dict else dict(_state["current_weights"])

    variables_n = {k: getattr(sku, k) for k in PRIMARY_VARS}
    score = engine.compute_score(variables_n, weights)
    tier_info = engine.get_priority_tier(score)
    contributions = engine.compute_variable_contributions(variables_n, weights)

    return {
        "sku_id": sku.SKU_ID,
        "priority_score": round(score, 6),
        "tier": tier_info["tier"],
        "action": tier_info["action"],
        "response_time": tier_info["response_time"],
        "variable_contributions": {k: round(v, 6) for k, v in contributions.items()},
        "weights_used": {k: round(v, 6) for k, v in weights.items()},
        "shap_explanation": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _score_single_ensemble(sku: SKUInput) -> Dict[str, Any]:
    """Score a single SKU using the ML ensemble + SHAP explanation."""
    ext_dict = _extract_external_factors(sku.external_factors)
    weight_engine = _state["weight_engine"]
    weights = weight_engine.compute_weights(ext_dict) if ext_dict else dict(_state["current_weights"])

    feature_values = [getattr(sku, k) for k in PRIMARY_VARS]
    for feat in ALL_FEATURES:
        if feat not in PRIMARY_VARS:
            feature_values.append(ext_dict.get(feat, 0.0))

    X = np.array(feature_values, dtype=np.float32).reshape(1, -1)
    models = _state["models"]

    try:
        from src.ensemble import EnsemblePredictor  # noqa: E402
    except ImportError:
        from ensemble import EnsemblePredictor  # noqa: E402
    predictor = EnsemblePredictor()
    final_score = float(predictor.predict(X, models["xgb"], models["lgbm"], models["mlp"], models["meta_learner"])[0])
    final_score = float(np.clip(final_score, 0.0, 1.0))

    scoring_engine = _state["scoring_engine"]
    tier_info = scoring_engine.get_priority_tier(final_score)
    variables_n = {k: getattr(sku, k) for k in PRIMARY_VARS}
    contributions = scoring_engine.compute_variable_contributions(variables_n, weights)

    # SHAP explanation
    shap_result = None
    explainer: ModelExplainer = _state["explainer"]
    if explainer._is_setup:
        shap_result = explainer.explain_single_sku(X, sku.SKU_ID)

    return {
        "sku_id": sku.SKU_ID,
        "priority_score": round(final_score, 6),
        "tier": tier_info["tier"],
        "action": tier_info["action"],
        "response_time": tier_info["response_time"],
        "variable_contributions": {k: round(v, 6) for k, v in contributions.items()},
        "weights_used": {k: round(v, 6) for k, v in weights.items()},
        "shap_explanation": shap_result,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

# ── Scoring ──────────────────────────────────────────────────────────────────


@app.post("/score/single", response_model=SingleScoreResponse)
async def score_single(sku: SKUInput) -> SingleScoreResponse:
    """Score a single SKU and return priority tier, action, and SHAP explanation."""
    try:
        if _state["models_loaded"]:
            result = _score_single_ensemble(sku)
        else:
            result = _score_single_deterministic(sku)
        return SingleScoreResponse(**result)
    except Exception as exc:
        logger.exception("Error scoring SKU %s", sku.SKU_ID)
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")


@app.post("/score/batch", response_model=BatchScoreResponse)
async def score_batch(skus: List[SKUInput]) -> BatchScoreResponse:
    """Score a batch of SKUs and return ranked results sorted descending by score."""
    if not skus:
        raise HTTPException(status_code=400, detail="Empty SKU list.")

    try:
        results: List[Dict[str, Any]] = []
        for sku in skus:
            if _state["models_loaded"]:
                result = _score_single_ensemble(sku)
            else:
                result = _score_single_deterministic(sku)
            results.append(result)

        results.sort(key=lambda r: r["priority_score"], reverse=True)

        return BatchScoreResponse(
            results=results,
            total=len(results),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        logger.exception("Error in batch scoring")
        raise HTTPException(status_code=500, detail=f"Batch scoring failed: {exc}")


@app.get("/score/critical")
async def score_critical(threshold: float = Query(0.75, ge=0.0, le=1.0)) -> Dict[str, Any]:
    """Return all SKUs above the given priority threshold.

    This endpoint requires a prior batch scoring call or stored scores.
    For demonstration, it returns the tier configuration for the threshold.
    """
    critical_tiers = {
        name: info for name, info in PRIORITY_TIERS.items()
        if info["min"] >= threshold
    }
    return {
        "threshold": threshold,
        "critical_tiers": critical_tiers,
        "message": "Submit SKUs via POST /score/batch and filter results client-side, "
                   "or use this endpoint after integrating with a score cache.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Weights ──────────────────────────────────────────────────────────────────


@app.get("/weights/current", response_model=WeightsResponse)
async def weights_current() -> WeightsResponse:
    """Return the current 8 weight values, external factors, and timestamp."""
    return WeightsResponse(
        weights=_state["current_weights"],
        external_factors=_state["current_external_factors"] or None,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/weights/recalculate", response_model=WeightsRecalculateResponse)
async def weights_recalculate(factors: ExternalFactorsInput) -> WeightsRecalculateResponse:
    """Recalculate weights from updated external factor values."""
    try:
        ext_dict = factors.model_dump()
        weight_engine: WeightEngine = _state["weight_engine"]
        previous = dict(_state["current_weights"])

        new_weights = weight_engine.compute_weights(ext_dict)
        comparison = {k: round(new_weights.get(k, 0.0) - previous.get(k, 0.0), 6) for k in new_weights}

        _state["current_weights"] = new_weights
        _state["current_external_factors"] = ext_dict

        return WeightsRecalculateResponse(
            new_weights=new_weights,
            previous_weights=previous,
            comparison=comparison,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        logger.exception("Error recalculating weights")
        raise HTTPException(status_code=500, detail=f"Weight recalculation failed: {exc}")


# ── Explainability ───────────────────────────────────────────────────────────


@app.get("/explain/{sku_id}")
async def explain_sku(sku_id: str) -> Dict[str, Any]:
    """Return a full SHAP transparency report for one SKU.

    Requires models to be loaded and explainers to be set up.
    Falls back to a placeholder when SHAP is unavailable.
    """
    explainer: ModelExplainer = _state["explainer"]

    # Build a zero-feature vector as placeholder when no live data is cached
    n_features = len(ALL_FEATURES)
    dummy_features = np.zeros((1, n_features), dtype=np.float32)

    shap_result = explainer.explain_single_sku(dummy_features, sku_id)

    report = explainer.generate_transparency_report(
        sku_id=sku_id,
        shap_result=shap_result,
        weights=_state["current_weights"],
        external_factors=_state["current_external_factors"],
    )
    return report


# ── Health ───────────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return API health status, model version, and scoring mode."""
    return HealthResponse(
        status="healthy",
        model_version=_state["model_version"],
        models_loaded=_state["models_loaded"],
        scoring_mode=_state["scoring_mode"],
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# ── Feedback ─────────────────────────────────────────────────────────────────


@app.post("/feedback/{sku_id}", response_model=FeedbackResponse)
async def submit_feedback(sku_id: str, payload: FeedbackInput) -> FeedbackResponse:
    """Store actual restock outcome in SQLite for future retraining."""
    try:
        db: Session = SessionLocal()
        try:
            record = Feedback(
                sku_id=sku_id,
                predicted_score=payload.predicted_score,
                predicted_tier=payload.predicted_tier,
                actual_outcome=payload.actual_outcome,
                notes=payload.notes,
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            feedback_id = record.id
        finally:
            db.close()

        return FeedbackResponse(
            sku_id=sku_id,
            feedback_id=feedback_id,
            message="Feedback recorded successfully.",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        logger.exception("Error storing feedback for SKU %s", sku_id)
        raise HTTPException(status_code=500, detail=f"Feedback storage failed: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# Entrypoint
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run("api:app", host=API_HOST, port=API_PORT, workers=1)
