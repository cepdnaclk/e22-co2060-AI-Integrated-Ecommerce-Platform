# 🚀 Quick Start - GitHub to E-Commerce in 30 Minutes

Fast-track guide to deploy YouTube Trending System as a microservice.

---

## ⏱️ **30-Minute Timeline**

```
0-5 min:   Git setup & push to GitHub
5-10 min:  Create GitHub Secrets
10-15 min: Verify CI/CD build
15-25 min: Deploy to e-commerce platform
25-30 min: Test and celebrate 🎉
```

---

## 🎯 **5 Minutes: Git & Push to GitHub**

```bash
# 1. Navigate to project
cd c:\Users\chand\Desktop\youtube-trending-system

# 2. Initialize git
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 3. Stage and commit
git add .
git commit -m "Initial: YouTube Trending System"

# 4. Create GitHub repo (go to github.com/new)
# Name: youtube-trending-system
# Public or Private: (choose)
# Do NOT init with README
# Click Create

# 5. Connect and push
git remote add origin https://github.com/YOUR_USERNAME/youtube-trending-system.git
git branch -M main
git push -u origin main

# ✅ Done! Code is on GitHub
```

---

## 🔐 **5 Minutes: Add GitHub Secrets**

**Go to: GitHub.com → Your Repository → Settings → Secrets and variables → Actions**

Click "New repository secret" and add these 5 secrets:

### **Secret 1: YOUTUBE_API_KEY**
- Paste your YouTube Data API v3 key

### **Secret 2: GOOGLE_SHEET_ID**
- From your Google Sheet URL: `https://docs.google.com/spreadsheets/d/[THIS_ID]/edit`

### **Secret 3: GOOGLE_CREDENTIALS_JSON**
- Open `credentials.json` file
- Copy entire contents (starts with `{` ends with `}`)
- Paste as secret value

### **Secret 4: DOCKER_HUB_USERNAME** (Optional)
- Your Docker Hub username

### **Secret 5: DOCKER_HUB_TOKEN** (Optional)
- Your Docker Hub access token

**✅ Done! Secrets are secured**

---

## 🏗️ **5 Minutes: Verify CI/CD Build**

1. Go to your repository on GitHub.com
2. Click "Actions" tab
3. Click the latest workflow run
4. Wait for it to complete (2-3 minutes)
5. Should see ✅ "Build and Push Docker Image - PASSED"

**✅ Docker image is built and pushed to ghcr.io!**

---

## 🚀 **10 Minutes: Deploy to E-Commerce**

### **Step 1: In your e-commerce platform folder**

```bash
mkdir -p ecommerce-with-trending
cd ecommerce-with-trending
```

### **Step 2: Create `docker-compose.yml`**

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  ecommerce-api:
    build: .
    ports:
      - "5000:5000"
    depends_on:
      - youtube-trending
    environment:
      YOUTUBE_TRENDING_URL: http://youtube-trending:8000

  youtube-trending:
    image: ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
    ports:
      - "8000:8000"
    environment:
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
      GOOGLE_SHEET_ID: ${GOOGLE_SHEET_ID}
      GOOGLE_CREDENTIALS_JSON: ${GOOGLE_CREDENTIALS_JSON}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  trending_data:

networks:
  default:
    driver: bridge
EOF
```

### **Step 3: Create `.env`**

```bash
cat > .env << 'EOF'
YOUTUBE_API_KEY=<paste_your_api_key>
GOOGLE_SHEET_ID=<paste_your_sheet_id>
GOOGLE_CREDENTIALS_JSON=<paste_entire_credentials_json>
EOF
```

### **Step 4: Add to .gitignore**

```bash
echo ".env" >> .gitignore
```

### **Step 5: Start services**

```bash
# Login to GitHub Container Registry (one time)
docker login ghcr.io
# Username: YOUR_GITHUB_USERNAME
# Password: Your GitHub personal access token (from Settings > Developer settings)

# Pull and run
docker-compose up -d
```

**✅ Services are running!**

---

## ✅ **5 Minutes: Test**

### **Test 1: Check services are running**
```bash
docker-compose ps
# Should show both services as "Up"
```

### **Test 2: Health check**
```bash
curl http://localhost:8000/health
# Response: {"status": "healthy", ...}
```

### **Test 3: Get trending data**
```bash
curl http://localhost:8000/
# Response: {"top3": [...]}
```

### **Test 4: E-Commerce calls it**
```bash
curl http://localhost:5000/api/products/trending
# Response: Trending products from YouTube service
```

**✅ Everything works! 🎉**

---

## 📋 **Credential Security - The Golden Rule**

```
Never in Image:          ❌ .env ❌ credentials.json
Never in Git:            ❌ .env ❌ credentials.json
Always in .gitignore:    ✅ .env ✅ credentials.json
Safe in GitHub:          ✅ GitHub Secrets (encrypted)
Safe at runtime:         ✅ Environment variables only
```

---

## 🔄 **Future Updates (Super Easy)**

When you want to update the service:

```bash
# 1. Make code changes in YouTube Trending repo
vim app/main.py

# 2. Commit and push
git add .
git commit -m "Updated feature"
git push origin main

# 3. GitHub Actions auto-builds (no action needed!)

# 4. In e-commerce platform, just pull latest
docker-compose pull youtube-trending
docker-compose up -d youtube-trending

# ✅ Updated! No credential re-entry needed.
```

---

## 🎓 **Key Concepts**

### **GitHub Repository** 
- Your source code
- Safe to make public
- GitHub Secrets store credentials (encrypted)

### **Docker Image**
- Built automatically by GitHub Actions
- Contains code + dependencies
- NO credentials inside
- Pushed to ghcr.io (registry)

### **E-Commerce Integration**
- Pulls image from registry
- Reads local `.env` for credentials
- Starts service with env variables
- Services communicate on internal network

### **Security**
- Credentials never in image
- Credentials never in git
- Credentials only in GitHub Secrets (build) and .env (runtime)
- Complete separation of code and secrets

---

## 🆘 **Quick Troubleshooting**

### **"Image not found"**
```bash
# Did you commit and push?
git push origin main

# Is GitHub Actions workflow done?
# Check: Repository → Actions tab

# Workflow success? Then pull:
docker pull ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
```

### **"No trending data yet"**
```bash
# It's ok! First time takes time. Run pipeline:
docker-compose exec youtube-trending python run_daily_pipeline.py
```

### **"Connection refused"**
```bash
# Is service running?
docker-compose ps

# If not, restart:
docker-compose restart youtube-trending

# Check logs:
docker-compose logs youtube-trending
```

### **".env not found"**
```bash
# Create it:
cat > .env << 'EOF'
YOUTUBE_API_KEY=your_key
GOOGLE_SHEET_ID=your_id
GOOGLE_CREDENTIALS_JSON=your_json
EOF
```

---

## 📊 **What You've Accomplished**

✅ Pushed code to GitHub  
✅ Secured credentials with GitHub Secrets  
✅ Automated Docker image builds with GitHub Actions  
✅ Image ready in Docker registry (ghcr.io)  
✅ Integrated as microservice in e-commerce  
✅ All tests passing  
✅ Production-ready setup  

---

## 🎯 **Next Steps**

1. **Monitor**: `docker-compose logs -f`
2. **Scale**: Add more replicas if needed
3. **Integrate Frontend**: Use `/api/products/trending` in your React/Vue/Angular
4. **Automate**: Set up scheduled pipeline runs
5. **Production**: Deploy to AWS/GCP/Azure with Kubernetes

---

## 📞 **One-Liners You'll Use**

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f youtube-trending

# Update code
git push origin main

# Deploy update
docker-compose pull && docker-compose up -d

# Stop services
docker-compose down

# Rebuild without cache
docker-compose build --no-cache

# Access container
docker-compose exec youtube-trending bash

# Full cleanup
docker-compose down -v
```

---

## 🎉 **You're Done!**

Your YouTube Trending System is now:
- ✅ On GitHub
- ✅ Auto-building with GitHub Actions
- ✅ In Docker registry (ghcr.io)
- ✅ Running as a microservice
- ✅ Integrated with e-commerce
- ✅ Secure and production-ready

**The system will auto-run the pipeline daily at 03:00 UTC and update trending data. Your e-commerce platform can call the API anytime to get the latest trends!**

---

**Questions? Check these docs:**
- [GITHUB_DOCKER_SETUP.md](GITHUB_DOCKER_SETUP.md) - Detailed setup
- [MICROSERVICE_DEPLOYMENT.md](MICROSERVICE_DEPLOYMENT.md) - Full workflow
- [CREDENTIAL_MANAGEMENT.md](CREDENTIAL_MANAGEMENT.md) - Security details
- [INTEGRATION_EXAMPLES.md](INTEGRATION_EXAMPLES.md) - Code examples
- [PROCESS_FLOW_VISUAL.md](PROCESS_FLOW_VISUAL.md) - Visual diagrams

---

**Happy deploying! 🚀**
