# Docker Setup Guide - YouTube Trending System

Complete guide to containerize and deploy the YouTube Trending System using Docker.

---

## 🐳 Quick Start (5 minutes)

### 1. **Prepare Environment File**

Copy the example file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```bash
YOUTUBE_API_KEY=your_api_key
GOOGLE_SHEET_ID=your_sheet_id
API_PORT=8000
```

### 2. **Copy Google Credentials**

Place your `credentials.json` in the project root:
```bash
cp /path/to/credentials.json .
```

### 3. **Start the Container**

```bash
docker-compose up -d
```

### 4. **Access the API**

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "top3": [
    {"Keyword": "iPhone", "GrowthRate": 1.45},
    {"Keyword": "Smart TV", "GrowthRate": 1.32},
    {"Keyword": "Laptop", "GrowthRate": 1.18}
  ]
}
```

---

## 📋 Detailed Setup

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Google API credentials (JSON file)
- YouTube API key

### Installation

**Windows (via Docker Desktop):**
1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Install and restart
3. Enable WSL 2 backend

**macOS:**
```bash
brew install docker docker-compose
# or use Docker Desktop for Mac
```

**Linux:**
```bash
sudo apt-get install docker.io docker-compose
```

---

## 🚀 Deployment Options

### **Option 1: Basic Deployment (FastAPI Only)**

**Start container:**
```bash
docker-compose up -d youtube-trending-api
```

**Check logs:**
```bash
docker-compose logs -f youtube-trending-api
```

**Stop container:**
```bash
docker-compose down
```

---

### **Option 2: Full Deployment (API + Scheduler)**

Uncomment the scheduler service in `docker-compose.yml`:

```yaml
youtube-trending-scheduler:
  build:
    context: .
    dockerfile: Dockerfile.scheduler
  # ... rest of config
```

**Start both services:**
```bash
docker-compose up -d
```

**Verify both running:**
```bash
docker-compose ps
```

---

## ⚙️ Configuration

### **Custom Port**

Change the API port in `.env`:
```bash
API_PORT=9000  # Change to desired port
```

Then access: `http://localhost:9000/`

### **Custom Schedule (Scheduler)**

Change pipeline execution time in `.env`:
```bash
# Run at 06:00 UTC instead of 03:00
SCHEDULE_TIME=06:00
```

### **Logging Level**

```bash
LOG_LEVEL=DEBUG  # For verbose logs
```

---

## 📊 Docker Commands Reference

### **Container Management**

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart youtube-trending-api

# View running containers
docker-compose ps

# View logs
docker-compose logs youtube-trending-api
docker-compose logs -f youtube-trending-api  # Follow logs

# Execute command in container
docker-compose exec youtube-trending-api bash
```

### **Image Management**

```bash
# Build image
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# View images
docker images

# Remove image
docker rmi youtube-trending-system_youtube-trending-api
```

### **Volume Management**

```bash
# List volumes
docker volume ls

# View volume contents
docker volume inspect youtube-trending-system_storage

# Cleanup unused volumes
docker volume prune
```

---

## 🩺 Monitoring & Debugging

### **Health Check**

```bash
# Check container health
docker-compose ps

# Manual health test
curl http://localhost:8000/

# Check health logs
docker-compose logs youtube-trending-api | grep "Health"
```

### **View Logs**

```bash
# Last 50 lines
docker-compose logs --tail=50 youtube-trending-api

# Real-time logs
docker-compose logs -f

# Logs with timestamps
docker-compose logs --timestamps youtube-trending-api
```

### **Access Container Shell**

```bash
docker-compose exec youtube-trending-api bash
```

Inside container:
```bash
# Check Python version
python --version

# Check dependencies
pip list

# View storage files
ls -la storage/
ls -la output/
```

---

## 🔐 Security Best Practices

### **1. Never Commit Credentials**

```bash
# .gitignore already includes:
.env
credentials.json
```

Verify they're not committed:
```bash
git status  # Should not show .env or credentials.json
```

### **2. Use Environment Variables**

```bash
# ✅ Good: Use environment variables
docker-compose -f docker-compose.yml up -d

# ❌ Bad: Hardcoding credentials
docker run -e YOUTUBE_API_KEY=xyz...
```

### **3. Read-Only Credentials**

In `docker-compose.yml`, credentials are mounted read-only:
```yaml
volumes:
  - ./credentials.json:/app/credentials.json:ro
```

### **4. Network Isolation**

Services use internal network:
```yaml
networks:
  - youtube-trending-network
```

---

## 📈 Production Deployment

### **Scale to Multiple Instances**

```bash
# Deploy with multiple replicas
docker-compose up -d --scale youtube-trending-api=3
```

### **Use Docker Registry (AWS ECR, Docker Hub)**

```bash
# Build and tag
docker build -t myregistry/youtube-trending:latest .

# Push to registry
docker push myregistry/youtube-trending:latest

# Pull and run
docker pull myregistry/youtube-trending:latest
docker run -d -p 8000:8000 myregistry/youtube-trending:latest
```

### **Deploy with Kubernetes**

Create `youtube-trending-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: youtube-trending
spec:
  replicas: 3
  selector:
    matchLabels:
      app: youtube-trending
  template:
    metadata:
      labels:
        app: youtube-trending
    spec:
      containers:
      - name: youtube-trending-api
        image: myregistry/youtube-trending:latest
        ports:
        - containerPort: 8000
        env:
        - name: YOUTUBE_API_KEY
          valueFrom:
            secretKeyRef:
              name: yt-secrets
              key: api-key
        - name: GOOGLE_SHEET_ID
          valueFrom:
            secretKeyRef:
              name: yt-secrets
              key: sheet-id
        resources:
          limits:
            memory: "256Mi"
            cpu: "200m"
          requests:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: youtube-trending-service
spec:
  selector:
    app: youtube-trending
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

Deploy:
```bash
kubectl create secret generic yt-secrets \
  --from-literal=api-key=YOUR_KEY \
  --from-literal=sheet-id=YOUR_ID

kubectl apply -f youtube-trending-deployment.yaml

# Check status
kubectl get pods
kubectl get svc
```

---

## 🐛 Troubleshooting

### **Container Won't Start**

```bash
# Check logs
docker-compose logs youtube-trending-api

# Rebuild image
docker-compose build --no-cache

# Restart
docker-compose down && docker-compose up -d
```

### **API Returns "No trending data yet"**

```bash
# Check if output file exists
docker-compose exec youtube-trending-api ls -la output/

# Run pipeline manually
docker-compose exec youtube-trending-api python run_daily_pipeline.py

# Check logs
docker-compose logs youtube-trending-api
```

### **Permission Denied on Storage**

```bash
# Fix volume permissions
docker-compose down

# Fix ownership on host
sudo chown -R $USER:$USER storage/ output/ logs/

# Restart
docker-compose up -d
```

### **Memory Issues**

Increase Docker memory limit in Docker Desktop Settings or:

```bash
# Limit container memory
docker-compose down
docker-compose up -d --memory 1g
```

### **Network Issues**

```bash
# Test network connectivity
docker-compose exec youtube-trending-api ping 8.8.8.8

# Test API connectivity
docker-compose exec youtube-trending-api curl http://localhost:8000/
```

---

## 📝 Example Workflows

### **Daily Backup**

```bash
#!/bin/bash
# backup.sh - Backup data from container

DATE=$(date +%Y-%m-%d)
docker cp youtube-trending-api:/app/storage ./backups/storage_$DATE
docker cp youtube-trending-api:/app/output ./backups/output_$DATE
echo "Backup completed: $DATE"
```

### **Monitor with Email Alerts**

```bash
#!/bin/bash
# monitor.sh - Check health and send alert if down

STATUS=$(docker-compose ps | grep youtube-trending-api)
if [[ $STATUS == *"Exit"* ]]; then
  echo "Container crashed!" | mail -s "Alert" admin@example.com
  docker-compose restart youtube-trending-api
fi
```

---

## 🎯 Summary

| Task | Command |
|------|---------|
| Start | `docker-compose up -d` |
| Stop | `docker-compose down` |
| Logs | `docker-compose logs -f` |
| Status | `docker-compose ps` |
| Rebuild | `docker-compose build --no-cache` |
| Clean | `docker-compose down -v` |

---

## 📚 Further Reading

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Production Best Practices](https://docs.docker.com/develop/dev-best-practices/#use-multi-stage-builds)

---

**Last Updated**: April 2026
