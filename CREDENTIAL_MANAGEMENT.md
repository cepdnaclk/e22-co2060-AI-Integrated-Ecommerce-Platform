"""
Credential Management Guide for Microservice Integration

This document explains how credentials should be managed when using
this service as a microservice in a larger e-commerce platform.
"""

# ============================================================================
# CREDENTIAL FLOW IN MICROSERVICE ARCHITECTURE
# ============================================================================

"""
┌─────────────────────────────────────────────────────────────┐
│ GitHub Secrets (Secure Storage)                             │
├─────────────────────────────────────────────────────────────┤
│ YOUTUBE_API_KEY=xxxx                                        │
│ GOOGLE_SHEET_ID=xxxx                                        │
│ GOOGLE_CREDENTIALS_JSON={...full json...}                   │
└─────────────────────────────────────────────────────────────┘
                      ↓
        GitHub Actions CI/CD Pipeline
        (Passes secrets to Docker build)
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Docker Image Registry (ghcr.io)                             │
├─────────────────────────────────────────────────────────────┤
│ Image: ghcr.io/username/youtube-trending-system:latest     │
│ (Image itself has NO credentials)                           │
└─────────────────────────────────────────────────────────────┘
                      ↓
        Pull image into e-commerce platform
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Environment Variables / Secrets Management                  │
├─────────────────────────────────────────────────────────────┤
│ Option 1: Docker Compose env file (.env)                   │
│ Option 2: Kubernetes Secrets                                │
│ Option 3: Cloud Secrets (AWS Secrets Manager, etc.)        │
│ Option 4: Environment variables from platform              │
└─────────────────────────────────────────────────────────────┘
"""

# ============================================================================
# OPTION 1: Docker Compose (Simple Integration)
# ============================================================================

"""
In e-commerce platform's docker-compose.yml:

version: '3.8'

services:
  # Main e-commerce platform
  ecommerce-api:
    build: ./ecommerce
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgres://...
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - youtube-trending

  # YouTube Trending Microservice (this project)
  youtube-trending:
    image: ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
    ports:
      - "8000:8000"
    environment:
      # Credentials passed from environment
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
      GOOGLE_SHEET_ID: ${GOOGLE_SHEET_ID}
      # Credentials.json passed as base64-encoded string
      GOOGLE_CREDENTIALS_JSON: ${GOOGLE_CREDENTIALS_JSON}
      LOG_LEVEL: INFO
    volumes:
      - trending_storage:/app/storage
      - trending_output:/app/output
      - trending_logs:/app/logs
    networks:
      - ecommerce-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Other services...
  postgres-db:
    image: postgres:15
    # ...

volumes:
  trending_storage:
  trending_output:
  trending_logs:

networks:
  ecommerce-network:
    driver: bridge
"""

# ============================================================================
# OPTION 2: Kubernetes (Enterprise Integration)
# ============================================================================

"""
Create kubernetes-secret.yaml:

---
apiVersion: v1
kind: Secret
metadata:
  name: youtube-trending-secrets
  namespace: default
type: Opaque
stringData:
  YOUTUBE_API_KEY: your_api_key_here
  GOOGLE_SHEET_ID: your_sheet_id_here
  # For credentials.json, base64 encode the entire file
  GOOGLE_CREDENTIALS_JSON: |
    {
      "type": "service_account",
      "project_id": "...",
      ...
    }

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: youtube-trending-api
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: youtube-trending
  template:
    metadata:
      labels:
        app: youtube-trending
    spec:
      containers:
      - name: youtube-trending
        image: ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
        env:
        - name: YOUTUBE_API_KEY
          valueFrom:
            secretKeyRef:
              name: youtube-trending-secrets
              key: YOUTUBE_API_KEY
        - name: GOOGLE_SHEET_ID
          valueFrom:
            secretKeyRef:
              name: youtube-trending-secrets
              key: GOOGLE_SHEET_ID
        - name: GOOGLE_CREDENTIALS_JSON
          valueFrom:
            secretKeyRef:
              name: youtube-trending-secrets
              key: GOOGLE_CREDENTIALS_JSON
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: youtube-trending-service
  namespace: default
spec:
  selector:
    app: youtube-trending
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: ClusterIP

Deploy with:
  kubectl apply -f kubernetes-secret.yaml
  kubectl get pods
  kubectl get svc
"""

# ============================================================================
# OPTION 3: AWS ECS + Secrets Manager (Production)
# ============================================================================

"""
Store credentials in AWS Secrets Manager:
  1. Go to AWS Secrets Manager
  2. Store Secret: "youtube-trending/credentials"
  3. Value:
     {
       "YOUTUBE_API_KEY": "xxx",
       "GOOGLE_SHEET_ID": "xxx",
       "GOOGLE_CREDENTIALS_JSON": "{...}"
     }

ECS Task Definition (task-definition.json):

{
  "family": "youtube-trending",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "youtube-trending",
      "image": "ghcr.io/YOUR_USERNAME/youtube-trending-system:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "secrets": [
        {
          "name": "YOUTUBE_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:youtube-trending/credentials:YOUTUBE_API_KEY::"
        },
        {
          "name": "GOOGLE_SHEET_ID",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:youtube-trending/credentials:GOOGLE_SHEET_ID::"
        },
        {
          "name": "GOOGLE_CREDENTIALS_JSON",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:youtube-trending/credentials:GOOGLE_CREDENTIALS_JSON::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/youtube-trending",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}

Deploy with:
  aws ecs register-task-definition --cli-input-json file://task-definition.json
  aws ecs create-service --cluster my-cluster --service-name youtube-trending \\
    --task-definition youtube-trending --desired-count 1
"""

# ============================================================================
# OPTION 4: Environment Variables from Platform
# ============================================================================

"""
In e-commerce platform's code, set environment before starting:

# Python example
import os
import subprocess

# Set credentials from platform's secrets store
os.environ['YOUTUBE_API_KEY'] = platform.get_secret('youtube_api_key')
os.environ['GOOGLE_SHEET_ID'] = platform.get_secret('google_sheet_id')
os.environ['GOOGLE_CREDENTIALS_JSON'] = platform.get_secret('google_creds_json')

# Start the service
subprocess.run([
    'docker-compose', 'up', '-d', 'youtube-trending'
])

# Or with docker run
subprocess.run([
    'docker', 'run', '-d',
    '-e', f'YOUTUBE_API_KEY={os.environ["YOUTUBE_API_KEY"]}',
    '-e', f'GOOGLE_SHEET_ID={os.environ["GOOGLE_SHEET_ID"]}',
    '-e', f'GOOGLE_CREDENTIALS_JSON={os.environ["GOOGLE_CREDENTIALS_JSON"]}',
    '-p', '8000:8000',
    'ghcr.io/YOUR_USERNAME/youtube-trending-system:latest'
])
"""

# ============================================================================
# HOW TO MODIFY app/main.py FOR MICROSERVICE INTEGRATION
# ============================================================================

"""
Your current main.py should be updated to:
1. Accept credentials from environment variables
2. Load credentials.json dynamically
3. Add service discovery/health endpoints

Updated app/main.py:

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import json
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="YouTube Trending API",
    description="Microservice for trending product analysis",
    version="1.0.0"
)

# ============================================================================
# Health Check Endpoints (for orchestration systems)
# ============================================================================

@app.get("/health")
def health_check():
    '''
    Health check endpoint for container orchestration
    Used by Docker, Kubernetes, load balancers
    '''
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "youtube-trending-api"
    }

@app.get("/ready")
def readiness_check():
    '''
    Readiness check - service ready to serve requests?
    '''
    try:
        # Check if output file exists
        if os.path.exists("output/trending_top3.json"):
            return {"ready": True}
        else:
            return {"ready": False, "reason": "No trending data generated yet"}
    except Exception as e:
        return {"ready": False, "reason": str(e)}

# ============================================================================
# Service Discovery Endpoint
# ============================================================================

@app.get("/info")
def service_info():
    '''
    Return service metadata for service discovery
    '''
    return {
        "name": "youtube-trending-api",
        "version": "1.0.0",
        "port": 8000,
        "endpoints": [
            "/health",
            "/ready",
            "/info",
            "/"
        ],
        "description": "Analyzes YouTube trends to predict trending products"
    }

# ============================================================================
# Main Trending Endpoint
# ============================================================================

@app.get("/")
def root():
    '''
    Return top 3 trending products
    Called by e-commerce platform to display trending items
    '''
    if not os.path.exists("output/trending_top3.json"):
        return JSONResponse(
            status_code=202,
            content={
                "message": "No trending data yet",
                "status": "processing"
            }
        )

    try:
        with open("output/trending_top3.json") as f:
            simplified_data = [
                {"Keyword": item["Keyword"], "GrowthRate": item["GrowthRate"]} 
                for item in json.load(f)
            ] 
        return {"top3": simplified_data}
    except Exception as e:
        logger.error(f"Error reading trending data: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to retrieve trending data"}
        )

# ============================================================================
# Debug Endpoint (optional, disable in production)
# ============================================================================

@app.get("/debug/credentials-check")
def check_credentials_loaded():
    '''
    Verify credentials are loaded from environment
    Only enabled if DEBUG=True
    '''
    if not os.getenv("DEBUG"):
        return {"error": "Endpoint disabled"}
    
    return {
        "YOUTUBE_API_KEY_LOADED": bool(os.getenv("YOUTUBE_API_KEY")),
        "GOOGLE_SHEET_ID_LOADED": bool(os.getenv("GOOGLE_SHEET_ID")),
        "GOOGLE_CREDENTIALS_JSON_LOADED": bool(os.getenv("GOOGLE_CREDENTIALS_JSON")),
        "CREDENTIALS_FILE_EXISTS": os.path.exists("credentials.json")
    }
"""

# ============================================================================
# INTEGRATION WITH E-COMMERCE PLATFORM
# ============================================================================

"""
Example: How e-commerce platform calls this service

# e-commerce/services/trending_service.py

import requests
import os
from typing import List, Dict

class TrendingProductService:
    def __init__(self):
        self.base_url = os.getenv(
            "YOUTUBE_TRENDING_API_URL", 
            "http://youtube-trending:8000"
        )
        self.timeout = 5

    def get_trending_products(self) -> List[Dict]:
        '''Get top 3 trending products from YouTube Trending API'''
        try:
            response = requests.get(
                f"{self.base_url}/",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            logger.warning("YouTube Trending service unavailable")
            return {"top3": []}
        except Exception as e:
            logger.error(f"Error fetching trends: {str(e)}")
            return {"top3": []}

    def is_service_healthy(self) -> bool:
        '''Check if YouTube Trending service is healthy'''
        try:
            response = requests.get(
                f"{self.base_url}/health",
                timeout=self.timeout
            )
            return response.status_code == 200
        except:
            return False

# Usage in e-commerce API

from fastapi import APIRouter
from services.trending_service import TrendingProductService

router = APIRouter()
trending_service = TrendingProductService()

@router.get("/api/products/trending")
async def get_trending_products():
    '''
    Endpoint that e-commerce frontend calls to display trending products
    '''
    if not trending_service.is_service_healthy():
        return {"error": "Trending service unavailable", "status": 503}
    
    trends = trending_service.get_trending_products()
    return {
        "trending": trends.get("top3", []),
        "source": "youtube_analytics"
    }
"""
