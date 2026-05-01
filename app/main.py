from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

# ============================================================================
# Initialize FastAPI app with metadata
# ============================================================================
app = FastAPI(
    title="YouTube Trending ML API",
    description="REST API for YouTube trending products prediction",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================================
# Response Models
# ============================================================================
class TrendingProduct(BaseModel):
    Keyword: str
    Acceleration: float
    Rank: Optional[int] = None

class TrendingResponse(BaseModel):
    status: str
    timestamp: str
    top3: List[TrendingProduct]
    message: Optional[str] = None

class HealthCheckResponse(BaseModel):
    status: str
    timestamp: str
    api_version: str
    data_available: bool

# ============================================================================
# Health Check Endpoint
# ============================================================================
@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check():
    """
    Health check endpoint for monitoring system status.
    Returns API status, version, and data availability.
    """
    data_exists = os.path.exists("output/trending_top3.json")
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "api_version": "1.0.0",
        "data_available": data_exists
    }

# ============================================================================
# Main Trending Data Endpoint
# ============================================================================
@app.get("/api/trending", response_model=TrendingResponse, tags=["Trending"])
def get_trending_data():
    """
    Get top 3 trending products with acceleration metrics.
    Returns simplified data with Keyword and Acceleration for each product.
    """
    output_path = "output/trending_top3.json"
    
    if not os.path.exists(output_path):
        raise HTTPException(
            status_code=404,
            detail="No trending data available yet. Run the pipeline first."
        )
    
    try:
        with open(output_path) as f:
            data = json.load(f)
            
        # Format response with ranking
        simplified_data = [
            {
                "Keyword": item.get("Keyword"),
                "Acceleration": item.get("Acceleration"),
                "Rank": idx + 1
            }
            for idx, item in enumerate(data)
        ]
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "top3": simplified_data,
            "message": "Top 3 trending products retrieved successfully"
        }
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Error parsing trending data. File may be corrupted."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving trending data: {str(e)}"
        )

# ============================================================================
# Detailed Trending Data Endpoint
# ============================================================================
@app.get("/api/trending/detailed", tags=["Trending"])
def get_detailed_trending_data():
    """
    Get complete trending data with all features and metrics.
    Includes all calculated metrics from the ML model.
    """
    output_path = "output/trending_top3.json"
    
    if not os.path.exists(output_path):
        raise HTTPException(
            status_code=404,
            detail="No trending data available yet. Run the pipeline first."
        )
    
    try:
        with open(output_path) as f:
            data = json.load(f)
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "count": len(data),
            "data": data,
            "message": "Complete trending data retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving detailed trending data: {str(e)}"
        )

# ============================================================================
# Root Endpoint (Auto-redirect to docs)
# ============================================================================
@app.get("/", tags=["Info"])
def root():
    """
    Root endpoint. Automatically redirects to /docs for interactive API documentation.
    """
    return RedirectResponse(url="/docs")

# ============================================================================
# Run Instructions
# ============================================================================
# Development: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Production: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4