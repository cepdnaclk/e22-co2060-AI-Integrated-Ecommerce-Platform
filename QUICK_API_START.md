# 🚀 Quick Start - Run ML Model API

## Standard Approach Summary

Your YouTube Trending ML model is now exposed as a **FastAPI REST API** on a configurable port. This is the industry-standard way to serve ML models.

---

## 5-Minute Setup

### Step 1: Configure Port (Optional)
Edit `.env` file:
```
API_PORT=8000  # Change to any port you want (5000, 3000, etc.)
```

### Step 2: Run the API
```bash
docker-compose up
```

### Step 3: Access the API
```
http://localhost:8000/docs
```

That's it! You now have a fully documented, interactive API.

---

## What You Get

### 🔵 Live Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs` (Recommended!)
- **ReDoc**: `http://localhost:8000/redoc`
- Test endpoints directly from the browser

### 📊 API Endpoints

#### 1. Health Check
```bash
curl http://localhost:8000/health
```
Returns: API status and data availability

#### 2. Get Top 3 Trending (Recommended)
```bash
curl http://localhost:8000/api/trending
```
Response:
```json
{
  "status": "success",
  "timestamp": "2024-01-15T10:30:00",
  "top3": [
    {"Keyword": "iPhone 15", "GrowthRate": 45.2, "Rank": 1},
    {"Keyword": "Smart TV", "GrowthRate": 32.1, "Rank": 2},
    {"Keyword": "Laptop", "GrowthRate": 28.5, "Rank": 3}
  ]
}
```

#### 3. Get Detailed Data
```bash
curl http://localhost:8000/api/trending/detailed
```
Returns all metrics from the ML model

---

## Testing the API

### Using PowerShell (Recommended for Windows)
```powershell
.\test_api.ps1 -Port 8000
```

### Using Batch
```bash
test_api.bat 8000
```

### Using cURL
```bash
# Health check
curl http://localhost:8000/health

# Trending data
curl http://localhost:8000/api/trending

# Visit documentation
start http://localhost:8000/docs
```

---

## Using Different Ports

### On Port 5000
```bash
# Edit .env
API_PORT=5000

# Run
docker-compose up

# Access
http://localhost:5000/docs
```

### On Port 3000
```bash
API_PORT=3000 docker-compose up
```

---

## Standard Architecture

```
┌─────────────────────────────────┐
│  Your ML Model (Python Scripts) │
│  ├─ youtube_to_sheet.py         │
│  ├─ update_history.py           │
│  ├─ feature_engineering.py      │
│  ├─ predict_trending.py         │
│  └─ trend_model.py              │
└────────────┬────────────────────┘
             │
             ▼ (JSON output)
┌─────────────────────────────────┐
│  FastAPI Web Server             │
│  ├─ Port: 8000 (configurable)   │
│  ├─ Health check: /health       │
│  ├─ API: /api/trending          │
│  └─ Docs: /docs                 │
└────────────┬────────────────────┘
             │
             ▼ (HTTP REST API)
┌─────────────────────────────────┐
│  Clients/Applications           │
│  ├─ Web browsers                │
│  ├─ Mobile apps                 │
│  ├─ Python/Node.js clients      │
│  └─ Dashboards                  │
└─────────────────────────────────┘
```

---

## Features Included

✅ **FastAPI** - Modern, fast Python web framework  
✅ **Automatic Documentation** - Swagger UI + ReDoc  
✅ **Type Safety** - Pydantic models for requests/responses  
✅ **Error Handling** - Proper HTTP status codes  
✅ **Health Checks** - Monitor API status  
✅ **Docker Ready** - Run anywhere with Docker  
✅ **Port Configuration** - Easy to customize  
✅ **Timestamp Support** - Track data freshness  

---

## Calling the API from Python

```python
import requests

# Get trending data
response = requests.get('http://localhost:8000/api/trending')
data = response.json()

print(data['top3'])
# Output:
# [
#   {'Keyword': 'iPhone 15', 'GrowthRate': 45.2, 'Rank': 1},
#   {'Keyword': 'Smart TV', 'GrowthRate': 32.1, 'Rank': 2},
#   {'Keyword': 'Laptop', 'GrowthRate': 28.5, 'Rank': 3}
# ]
```

---

## Calling the API from JavaScript

```javascript
// Fetch trending data
fetch('http://localhost:8000/api/trending')
  .then(response => response.json())
  .then(data => {
    console.log(data.top3);
    data.top3.forEach(product => {
      console.log(`${product.Rank}. ${product.Keyword}: ${product.GrowthRate}%`);
    });
  });
```

---

## Production Deployment

For production, deploy using:
- **Docker** with your preferred container orchestration
- **Nginx** as reverse proxy
- **Environment variables** for configuration
- **SSL/TLS** certificates for HTTPS

```bash
# Production run
API_PORT=8000 docker-compose up -d
```

---

## Next Steps

1. ✅ Run `docker-compose up`
2. ✅ Visit `http://localhost:8000/docs`
3. ✅ Test endpoints interactively
4. ✅ Integrate into your applications
5. ✅ Schedule daily pipeline runs

---

## Troubleshooting

**Port already in use?**
```bash
API_PORT=8001 docker-compose up
```

**API not responding?**
```bash
# Check health
curl http://localhost:8000/health

# View logs
docker logs youtube-trending-api
```

**Need detailed output?**
See [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md) for full details.

---

## Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Docker Docs**: https://docs.docker.com/
- **OpenAPI Spec**: https://spec.openapis.org/
