# E-Commerce Integration Examples

Ready-to-use code examples for integrating the YouTube Trending microservice into your e-commerce platform.

---

## 🎯 **Quick Integration Patterns**

---

## 📝 **Example 1: FastAPI E-Commerce with Trending Service**

**File: `ecommerce/services/trending.py`**

```python
"""
Service to communicate with YouTube Trending microservice
"""

import os
import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime
from functools import lru_cache

logger = logging.getLogger(__name__)

class TrendingProductService:
    """
    Communicates with YouTube Trending API microservice
    """
    
    def __init__(self):
        # URL can be:
        # - Local: http://youtube-trending:8000 (Docker Compose)
        # - Local dev: http://localhost:8000
        # - Remote: https://trending.yourcompany.com
        self.base_url = os.getenv(
            "YOUTUBE_TRENDING_API_URL",
            "http://youtube-trending:8000"
        )
        self.timeout = 5
        self.cache_ttl = 3600  # Cache for 1 hour
    
    def is_available(self) -> bool:
        """Check if trending service is available"""
        try:
            response = httpx.get(
                f"{self.base_url}/health",
                timeout=self.timeout
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Trending service unavailable: {str(e)}")
            return False
    
    def is_ready(self) -> bool:
        """Check if trending service has data"""
        try:
            response = httpx.get(
                f"{self.base_url}/ready",
                timeout=self.timeout
            )
            return response.json().get("ready", False)
        except Exception as e:
            logger.warning(f"Error checking readiness: {str(e)}")
            return False
    
    def get_trending_products(self) -> Optional[List[Dict]]:
        """
        Get top 3 trending products from YouTube API
        
        Returns:
            List of trending products with growth rates
            Example: [
                {"Keyword": "iPhone", "GrowthRate": 1.45},
                {"Keyword": "Smart TV", "GrowthRate": 1.32},
                {"Keyword": "Laptop", "GrowthRate": 1.18}
            ]
        """
        try:
            response = httpx.get(
                f"{self.base_url}/",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return data.get("top3", [])
        except httpx.ConnectError:
            logger.error("Failed to connect to trending service")
            return None
        except httpx.TimeoutException:
            logger.error("Trending service request timed out")
            return None
        except Exception as e:
            logger.error(f"Error fetching trends: {str(e)}")
            return None
    
    def get_service_info(self) -> Optional[Dict]:
        """Get service metadata"""
        try:
            response = httpx.get(
                f"{self.base_url}/info",
                timeout=self.timeout
            )
            return response.json()
        except:
            return None

# Create service instance
trending_service = TrendingProductService()
```

**File: `ecommerce/routes/products.py`**

```python
from fastapi import APIRouter, HTTPException
from services.trending import trending_service

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/trending")
async def get_trending_products():
    """
    Get trending products from YouTube analysis
    
    Used to display "Trending Now" section on homepage
    """
    if not trending_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Trending service temporarily unavailable"
        )
    
    trends = trending_service.get_trending_products()
    
    if trends is None:
        return {
            "trending": [],
            "status": "processing",
            "message": "Analyzing trends..."
        }
    
    return {
        "trending": trends,
        "status": "ready",
        "count": len(trends),
        "timestamp": datetime.now().isoformat()
    }

@router.get("/trending/health")
async def check_trending_health():
    """Check if trending service is healthy"""
    return {
        "available": trending_service.is_available(),
        "ready": trending_service.is_ready(),
        "info": trending_service.get_service_info()
    }
```

**File: `ecommerce/main.py`**

```python
from fastapi import FastAPI
from routes import products

app = FastAPI(title="E-Commerce API")

# Include products routes (which includes trending)
app.include_router(products.router)

@app.get("/")
def root():
    return {"message": "E-Commerce API with YouTube Trending Integration"}
```

---

## 🐳 **Example 2: Docker Compose Setup**

**File: `docker-compose.yml` (in e-commerce platform)**

```yaml
version: '3.8'

services:
  # Main E-Commerce API
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ecommerce-api
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      YOUTUBE_TRENDING_API_URL: http://youtube-trending:8000
      LOG_LEVEL: INFO
    depends_on:
      - postgres
      - youtube-trending
    networks:
      - ecommerce-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # YouTube Trending Microservice
  youtube-trending:
    image: ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
    container_name: youtube-trending-api
    ports:
      - "8000:8000"
    environment:
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
      GOOGLE_SHEET_ID: ${GOOGLE_SHEET_ID}
      GOOGLE_CREDENTIALS_JSON: ${GOOGLE_CREDENTIALS_JSON}
      LOG_LEVEL: INFO
    volumes:
      - trending_storage:/app/storage
      - trending_output:/app/output
      - trending_logs:/app/logs
    networks:
      - ecommerce-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: ecommerce-db
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ecommerce-net
    restart: unless-stopped

volumes:
  postgres_data:
  trending_storage:
  trending_output:
  trending_logs:

networks:
  ecommerce-net:
    driver: bridge
```

**File: `.env`**

```env
# Database Configuration
DATABASE_URL=postgresql://ecommerce_user:secure_password@postgres:5432/ecommerce
DB_USER=ecommerce_user
DB_PASSWORD=secure_password

# E-Commerce API
JWT_SECRET=your_jwt_secret_key_here
LOG_LEVEL=INFO

# YouTube Trending Microservice Credentials
YOUTUBE_API_KEY=your_youtube_api_key_here
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

**Start everything:**
```bash
docker-compose up -d
```

---

## 🌐 **Example 3: React Frontend Integration**

**File: `frontend/components/TrendingSection.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrendingSection = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrending();
    // Refresh trending every 5 minutes
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products/trending');
      setTrending(response.data.trending);
      setError(null);
    } catch (err) {
      console.error('Error fetching trending:', err);
      setError('Failed to load trending products');
      setTrending([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="trending-skeleton">Loading trends...</div>;

  if (error) return <div className="trending-error">{error}</div>;

  if (trending.length === 0) return <div>No trending products yet</div>;

  return (
    <section className="trending-section">
      <h2>🔥 Trending Now</h2>
      <div className="trending-grid">
        {trending.map((product, index) => (
          <div key={index} className="trending-card">
            <div className="rank">#{index + 1}</div>
            <h3>{product.Keyword}</h3>
            <p className="growth-rate">
              ⬆️ {(product.GrowthRate * 100).toFixed(1)}% growth
            </p>
            <button 
              onClick={() => searchProduct(product.Keyword)}
              className="btn-view"
            >
              View {product.Keyword}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingSection;
```

---

## 🔄 **Example 4: Scheduled Sync with Trending Data**

**File: `ecommerce/tasks/sync_trending.py`**

```python
"""
Background task to sync trending products with database
Runs every hour
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from services.trending import trending_service

Base = declarative_base()

class TrendingProduct(Base):
    """Store trending product history"""
    __tablename__ = "trending_products"
    
    id = Column(Integer, primary_key=True)
    keyword = Column(String, nullable=False)
    growth_rate = Column(Float, nullable=False)
    synced_at = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)

async def sync_trending_products():
    """
    Fetch trending products and store in database
    """
    print(f"[{datetime.now()}] Syncing trending products...")
    
    # Get trending from microservice
    trends = trending_service.get_trending_products()
    
    if not trends:
        print("No trends available")
        return
    
    # Store in database
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Clear old trends
        session.query(TrendingProduct).delete()
        
        # Add new trends
        for trend in trends:
            product = TrendingProduct(
                keyword=trend['Keyword'],
                growth_rate=trend['GrowthRate'],
                valid_until=datetime.utcnow() + timedelta(hours=24)
            )
            session.add(product)
        
        session.commit()
        print(f"✅ Synced {len(trends)} trending products")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Sync failed: {str(e)}")
    finally:
        session.close()

# Run with APScheduler
from apscheduler.schedulers.background import BackgroundScheduler

def start_sync_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        sync_trending_products,
        'interval',
        hours=1,
        id='sync_trending_products'
    )
    scheduler.start()
    print("✅ Trending sync scheduler started")
```

---

## 📊 **Example 5: Analytics Dashboard**

**File: `ecommerce/routes/analytics.py`**

```python
from fastapi import APIRouter
from services.trending import trending_service
from datetime import datetime

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/trending-summary")
async def get_trending_summary():
    """
    Get summary of current trending products
    Used in admin dashboard
    """
    trends = trending_service.get_trending_products()
    
    if not trends:
        return {"summary": None, "status": "no_data"}
    
    return {
        "summary": {
            "top_product": trends[0]['Keyword'],
            "top_growth": f"{trends[0]['GrowthRate'] * 100:.1f}%",
            "all_trends": trends,
            "generated_at": datetime.now().isoformat()
        },
        "status": "success"
    }

@router.get("/trending-comparison")
async def compare_trending():
    """Compare current trends with previous day"""
    # Implementation depends on your data storage
    trends = trending_service.get_trending_products()
    
    # Would compare with historical data from database
    return {
        "current": trends,
        "comparison": "implementation_specific"
    }
```

---

## ✅ **Deployment Verification Checklist**

```bash
# 1. Verify all services running
docker-compose ps

# 2. Check microservice health
curl http://localhost:8000/health

# 3. Check e-commerce API health
curl http://localhost:5000/

# 4. Test trending endpoint
curl http://localhost:5000/api/products/trending

# 5. View logs if issues
docker-compose logs youtube-trending
docker-compose logs api

# 6. Access database if needed
docker-compose exec postgres psql -U ecommerce_user -d ecommerce
```

---

## 🚀 **Production Deployment**

For production on cloud (AWS, GCP, Azure):

```bash
# 1. Use environment-specific .env files
.env.development
.env.staging
.env.production

# 2. Use secrets management
AWS Secrets Manager / Google Secret Manager / Azure Key Vault

# 3. Deploy with CI/CD (GitHub Actions, GitLab CI)
# 4. Use infrastructure-as-code (Terraform, CloudFormation)
# 5. Monitor with logging (CloudWatch, Stackdriver, Application Insights)
# 6. Scale with load balancers and auto-scaling groups
```

---

**Ready to integrate! 🎉**
