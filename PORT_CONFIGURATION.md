# Port Configuration Guide

## Quick Start

Your API is configured to run on port **8000** by default. To change this:

### Option 1: Using Environment Variables (Recommended for Docker)

1. **Edit or create `.env` file:**
   ```bash
   API_PORT=5000
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up
   ```
   The API will be accessible at `http://localhost:5000`

### Option 2: Direct Command Line (Local Development)

```bash
# Run on port 5000
uvicorn app.main:app --host 0.0.0.0 --port 5000

# Or run on port 3000
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

### Option 3: Windows Batch Script

```batch
@echo off
set API_PORT=5000
docker-compose up
```

---

## Default Port Configuration

| Component | Port | Environment Variable | Default |
|-----------|------|----------------------|---------|
| FastAPI Web Server | 8000 | `API_PORT` | 8000 |
| Swagger Docs | 8000 | Same | http://localhost:8000/docs |
| ReDoc | 8000 | Same | http://localhost:8000/redoc |

---

## API Endpoints

Once running, access these endpoints:

### Health Check
```
GET http://localhost:8000/health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00",
  "api_version": "1.0.0",
  "data_available": true
}
```

### Get Top 3 Trending Products
```
GET http://localhost:8000/api/trending
```
Response:
```json
{
  "status": "success",
  "timestamp": "2024-01-15T10:30:00",
  "top3": [
    {
      "Keyword": "iPhone 15",
      "GrowthRate": 45.2,
      "Rank": 1
    },
    {
      "Keyword": "Smart TV",
      "GrowthRate": 32.1,
      "Rank": 2
    },
    {
      "Keyword": "Laptop",
      "GrowthRate": 28.5,
      "Rank": 3
    }
  ],
  "message": "Top 3 trending products retrieved successfully"
}
```

### Get Detailed Trending Data
```
GET http://localhost:8000/api/trending/detailed
```
Returns complete data with all metrics from the ML model.

### Interactive API Documentation
```
http://localhost:8000/docs          # Swagger UI
http://localhost:8000/redoc         # ReDoc
http://localhost:8000/openapi.json  # OpenAPI Schema
```

---

## Docker Compose Configuration Details

The `docker-compose.yml` has:
- **Port Mapping**: `${API_PORT:-8000}:8000`
  - First number: Port on your machine (configurable via API_PORT env var)
  - Second number: Port inside container (fixed to 8000)
- **Health Check**: Runs every 30 seconds
- **Auto Restart**: Unless explicitly stopped
- **Volumes**: For persistent data storage

---

## Common Port Scenarios

### Running on Port 5000
```bash
export API_PORT=5000
docker-compose up
# Access at http://localhost:5000
```

### Running on Port 3000
```bash
export API_PORT=3000
docker-compose up
# Access at http://localhost:3000
```

### Running Multiple Instances on Different Ports
```bash
# Terminal 1
API_PORT=5000 docker-compose up -d

# Terminal 2 (use different container name)
API_PORT=6000 docker-compose -f docker-compose.yml up -d
```

---

## Troubleshooting

### Port Already in Use
**Error**: `Bind for 0.0.0.0:8000 failed: port is already allocated`

**Solution**:
```bash
# Find what's using the port (Windows)
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or just use a different port
API_PORT=8001 docker-compose up
```

### API Not Responding
```bash
# Check if container is running
docker ps

# Check logs
docker logs youtube-trending-api

# Test health endpoint
curl http://localhost:8000/health
```

### Permission Denied (Linux/Mac)
If you get permission errors on ports below 1024:
```bash
# Use ports >= 1024
API_PORT=8000 docker-compose up

# Or run with sudo (not recommended)
sudo docker-compose up
```

---

## Production Deployment

For production, use a reverse proxy (Nginx) with your chosen port:

```bash
# Run on internal port 8000
API_PORT=8000 docker-compose up -d

# Configure Nginx to forward external traffic to internal 8000
# Then access via your domain: https://yourdomain.com
```

---

## Environment Variables

Update your `.env` file to configure the port:

```bash
# API Port (default: 8000)
API_PORT=8000

# YouTube API
YOUTUBE_API_KEY=your_key_here
GOOGLE_SHEET_ID=your_sheet_id_here

# Logging
LOG_LEVEL=INFO
```

Run: `docker-compose up` and the API will automatically use your configured port.
