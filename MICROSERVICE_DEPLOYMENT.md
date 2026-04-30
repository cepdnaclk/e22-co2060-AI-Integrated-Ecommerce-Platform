# Microservice Deployment Guide - YouTube Trending System

Complete guide to push this project to GitHub and integrate as a microservice in an e-commerce platform.

---

## 🎯 **Overview: The Complete Flow**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Your Local Machine                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Git Push → GitHub                                                 │
│ 2. GitHub Actions triggered (CI/CD pipeline)                        │
│ 3. Build Docker image                                                │
│ 4. Push image to registry (GitHub Container Registry or DockerHub)  │
│ 5. Test image                                                        │
│ 6. Store credentials in GitHub Secrets                               │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GitHub                                                               │
├─────────────────────────────────────────────────────────────────────┤
│ - Source code repository                                            │
│ - GitHub Secrets (API keys, credentials)                            │
│ - GitHub Actions (automated CI/CD)                                  │
│ - Container Registry (ghcr.io)                                      │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ E-Commerce Platform                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐                            │
│ │ Main Platform Services               │                            │
│ │ (Product catalog, Orders, Users)     │                            │
│ └──────────────────────────────────────┘                            │
│              ↕                                                       │
│ ┌──────────────────────────────────────┐                            │
│ │ YouTube Trending Microservice        │                            │
│ │ (Pulled from registry, runs in       │                            │
│ │  Docker Compose or Kubernetes)       │                            │
│ └──────────────────────────────────────┘                            │
│              ↕                                                       │
│ ┌──────────────────────────────────────┐                            │
│ │ Credentials (via Secrets Management) │                            │
│ │ - API keys from env variables        │                            │
│ │ - Passed securely at runtime         │                            │
│ └──────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📝 **Part 1: Push to GitHub**

### **Step 1.1: Initialize Git (if not already done)**

```bash
cd c:\Users\chand\Desktop\youtube-trending-system

# Initialize git
git init

# Check git status
git status
```

### **Step 1.2: Create .gitignore (Important!)**

Already created, but verify it includes:
```bash
cat .gitignore
```

Should contain:
```
.env
credentials.json
__pycache__/
*.pyc
testenv/
testenv313/
logs/
output/*.json
storage/*.csv
```

### **Step 1.3: Add Files to Git**

```bash
# Stage all files
git add .

# Verify what will be committed
git status

# Important: Ensure .env and credentials.json are NOT included
# They should show as ignored:
# On branch main
# Untracked files not staged for commit:
#   (use "git add <file>..." to include in what will be committed)
#
# (nothing to commit)
```

### **Step 1.4: Create Initial Commit**

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"

git commit -m "Initial commit: YouTube Trending System microservice

- FastAPI server for serving trending products
- Pipeline for YouTube data analysis
- Docker containerization for microservice deployment
- ML-based trend scoring model"
```

### **Step 1.5: Create GitHub Repository**

1. Go to [GitHub](https://github.com/new)
2. Create repository: `youtube-trending-system`
3. **DO NOT** initialize with README (you already have one)
4. Copy the remote URL

### **Step 1.6: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/youtube-trending-system.git
git branch -M main
git push -u origin main

# Verify push was successful
git log --oneline -5
```

---

## 🔐 **Part 2: Store Credentials Securely in GitHub**

### **Step 2.1: Add GitHub Secrets**

Go to: `Settings → Secrets and variables → Actions → New repository secret`

Add these secrets:

**Secret 1: YOUTUBE_API_KEY**
```
Name: YOUTUBE_API_KEY
Value: your_actual_youtube_api_key_here
```

**Secret 2: GOOGLE_SHEET_ID**
```
Name: GOOGLE_SHEET_ID
Value: your_actual_google_sheet_id_here
```

**Secret 3: GOOGLE_CREDENTIALS_JSON**
```
Name: GOOGLE_CREDENTIALS_JSON
Value: (copy entire contents of your credentials.json file)
```

**Secret 4: DOCKER_HUB_USERNAME** (Optional - if using Docker Hub instead of GitHub Container Registry)
```
Name: DOCKER_HUB_USERNAME
Value: your_dockerhub_username
```

**Secret 5: DOCKER_HUB_TOKEN** (Optional)
```
Name: DOCKER_HUB_TOKEN
Value: your_dockerhub_access_token
```

---

## 🚀 **Part 3: GitHub Actions CI/CD Pipeline**

The CI/CD pipeline (`.github/workflows/docker-build.yml`) automatically:
1. Builds Docker image when you push code
2. Tests the image
3. Pushes to GitHub Container Registry
4. Makes it available for pulling

**Verify it's working:**
1. Push to GitHub: `git push origin main`
2. Go to: Repository → Actions tab
3. Watch workflow run
4. Image is pushed to: `ghcr.io/YOUR_USERNAME/youtube-trending-system:latest`

---

## 🐳 **Part 4: How Credentials Are Handled**

### **The Golden Rule: Credentials NEVER go into the image**

```
❌ WRONG - Baking credentials into image:
FROM python:3.11
COPY credentials.json /app/credentials.json  ← DON'T DO THIS!
ENV API_KEY=hardcoded_value  ← DON'T DO THIS!

✅ RIGHT - Pass at runtime:
FROM python:3.11
# No credentials in image
# Set via environment variables at runtime
```

### **Credential Flow in Production**

```
GitHub Secrets
    ↓
GitHub Actions (uses secrets during build)
    ↓
Docker Registry (image has NO secrets)
    ↓
Pull image into e-commerce platform
    ↓
Platform's Secrets Manager passes credentials to container
```

---

## 🔗 **Part 5: Integrating with E-Commerce Platform**

### **Scenario 1: Simple Docker Compose Integration**

E-commerce platform's `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Main e-commerce API
  ecommerce-api:
    build: ./ecommerce
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/ecommerce
    depends_on:
      - youtube-trending
      - postgres

  # YouTube Trending as a microservice
  youtube-trending:
    image: ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
    ports:
      - "8000:8000"
    environment:
      # Credentials from .env file
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
      GOOGLE_SHEET_ID: ${GOOGLE_SHEET_ID}
      GOOGLE_CREDENTIALS_JSON: ${GOOGLE_CREDENTIALS_JSON}
      LOG_LEVEL: INFO
    volumes:
      - trending_storage:/app/storage
      - trending_output:/app/output
    networks:
      - ecommerce-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  trending_storage:
  trending_output:
  postgres_data:

networks:
  ecommerce-net:
    driver: bridge
```

E-commerce platform's `.env`:

```env
# YouTube Trending Microservice Credentials
YOUTUBE_API_KEY=your_key_here
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# E-commerce Platform
DB_PASSWORD=secure_password
```

**Start everything:**
```bash
docker-compose up -d
```

### **Scenario 2: Kubernetes Integration**

Create `youtube-trending-secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: youtube-trending-secrets
  namespace: ecommerce
type: Opaque
data:
  YOUTUBE_API_KEY: <base64-encoded-key>
  GOOGLE_SHEET_ID: <base64-encoded-id>
  GOOGLE_CREDENTIALS_JSON: <base64-encoded-json>
```

Encode credentials:
```bash
echo -n "your_api_key" | base64
# Output: eW91cl9hcGlfa2V5
```

Create `youtube-trending-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: youtube-trending-api
  namespace: ecommerce
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
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: youtube-trending-service
  namespace: ecommerce
spec:
  selector:
    app: youtube-trending
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: ClusterIP
```

Deploy:
```bash
kubectl create namespace ecommerce
kubectl apply -f youtube-trending-secret.yaml
kubectl apply -f youtube-trending-deployment.yaml
kubectl get pods -n ecommerce
```

### **Scenario 3: AWS ECS Integration**

Store credentials in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name youtube-trending/credentials \
  --secret-string '{
    "YOUTUBE_API_KEY": "xxx",
    "GOOGLE_SHEET_ID": "xxx",
    "GOOGLE_CREDENTIALS_JSON": "{...}"
  }'
```

ECS task definition references the secret, not hardcoding values.

---

## 💡 **E-Commerce Platform Integration Pattern**

### **Frontend calls e-commerce API:**

```javascript
// frontend/pages/trending.js
fetch('/api/products/trending')
  .then(r => r.json())
  .then(data => {
    display(data.trending);  // Shows top 3 products
  });
```

### **E-commerce API calls YouTube Trending service:**

```python
# ecommerce/services/trending_service.py
import requests

class TrendingService:
    def get_trending(self):
        # Calls microservice on internal network
        response = requests.get('http://youtube-trending:8000/')
        return response.json()

# ecommerce/routes/products.py
from services.trending_service import TrendingService

trending_service = TrendingService()

@app.get("/api/products/trending")
def get_trending_products():
    trends = trending_service.get_trending()
    return {
        "trending": trends['top3'],
        "source": "youtube"
    }
```

**Data Flow:**
```
Frontend
  ↓ (GET /api/products/trending)
E-commerce API
  ↓ (GET /)
YouTube Trending Microservice
  ↓ (Reads output/trending_top3.json)
Returns JSON with top 3 products
```

---

## ✅ **Deployment Checklist**

- [ ] Push code to GitHub
- [ ] Create GitHub Secrets (5 secrets)
- [ ] Verify GitHub Actions workflow runs
- [ ] Image built and pushed to ghcr.io
- [ ] Pull image on e-commerce server
- [ ] Create .env with credentials
- [ ] Start with docker-compose
- [ ] Test `/health` endpoint
- [ ] Test `/` endpoint
- [ ] E-commerce platform successfully calls the service

---

## 🔒 **Security Best Practices**

1. **Never commit credentials** - They're in .gitignore
2. **Use GitHub Secrets** - Not environment variables in files
3. **Image has no secrets** - Only runtime injection
4. **Use internal networks** - Services talk on private networks
5. **Enable HTTPS** - Between e-commerce and this service
6. **Rotate credentials** - Update secrets regularly
7. **Monitor access** - Log all API calls

---

## 📋 **Quick Reference**

| Component | Location | Purpose |
|-----------|----------|---------|
| Source Code | GitHub | Version control |
| Secrets | GitHub Secrets | Secure credential storage |
| Docker Image | ghcr.io | Container registry |
| Credentials | Environment Variables | Passed at runtime |
| Integration | docker-compose or k8s | Deployed as microservice |

---

**You're now ready to deploy this as a production microservice! 🚀**
Value: your_actual_youtube_api_key
```

**Secret 2: GOOGLE_SHEET_ID**
```
Name: GOOGLE_SHEET_ID
Value: your_actual_google_sheet_id
```

**Secret 3: GOOGLE_CREDENTIALS_JSON**
```
Name: GOOGLE_CREDENTIALS_JSON
Value: (paste entire contents of credentials.json)
```

**Secret 4: DOCKER_REGISTRY_USERNAME** (if using Docker Hub)
```
Name: DOCKER_REGISTRY_USERNAME
Value: your_docker_hub_username
```

**Secret 5: DOCKER_REGISTRY_PASSWORD** (if using Docker Hub)
```
Name: DOCKER_REGISTRY_PASSWORD
Value: your_docker_hub_access_token
```

---

## 🚀 **Part 3: GitHub Actions CI/CD Pipeline**

Create `.github/workflows/docker-build.yml`:

```bash
mkdir -p .github/workflows
```

Now I'll create the CI/CD pipeline file for you.
