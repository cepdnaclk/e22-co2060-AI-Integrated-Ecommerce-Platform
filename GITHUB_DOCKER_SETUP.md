# GitHub & Docker Microservice Setup - Step by Step

Complete checklist for deploying YouTube Trending System to GitHub and integrating as a microservice.

---

## 📋 **Step-by-Step Checklist**

### **Phase 1: Local Setup (5 minutes)**

- [ ] Navigate to project directory
  ```bash
  cd c:\Users\chand\Desktop\youtube-trending-system
  ```

- [ ] Initialize git
  ```bash
  git init
  git config user.name "Your Name"
  git config user.email "your.email@example.com"
  ```

- [ ] Verify .gitignore exists and includes:
  ```bash
  # Should contain:
  .env
  credentials.json
  __pycache__/
  testenv/
  testenv313/
  storage/*.csv
  output/*.json
  ```

- [ ] Stage all files
  ```bash
  git add .
  git status
  # Verify .env and credentials.json NOT shown (they're ignored)
  ```

- [ ] Create first commit
  ```bash
  git commit -m "Initial: YouTube Trending System microservice"
  ```

---

### **Phase 2: GitHub Setup (10 minutes)**

- [ ] Create GitHub repository
  - Go to https://github.com/new
  - Name: `youtube-trending-system`
  - Description: "YouTube trend analysis microservice for e-commerce"
  - Public/Private: (choose based on preference)
  - DO NOT initialize with README
  - Click "Create repository"

- [ ] Add GitHub remote and push
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/youtube-trending-system.git
  git branch -M main
  git push -u origin main
  ```

- [ ] Verify push succeeded
  - Go to repository on GitHub.com
  - Should see all files

---

### **Phase 3: GitHub Secrets Setup (5 minutes)**

- [ ] Navigate to repository settings
  - Settings → Secrets and variables → Actions

- [ ] Create 5 secrets:

  **1. YOUTUBE_API_KEY**
  ```
  Paste your YouTube Data API v3 key
  ```

  **2. GOOGLE_SHEET_ID**
  ```
  Paste your Google Sheet ID (from URL)
  ```

  **3. GOOGLE_CREDENTIALS_JSON**
  ```
  Open credentials.json file and paste entire contents
  (Should start with { "type": "service_account", ... )
  ```

  **4. DOCKER_HUB_USERNAME** (Optional)
  ```
  Your Docker Hub username
  ```

  **5. DOCKER_HUB_TOKEN** (Optional)
  ```
  Your Docker Hub access token (from hub.docker.com/settings/security)
  ```

- [ ] Verify secrets created
  - All 5 should appear in Secrets list
  - Cannot view secret values (security feature)

---

### **Phase 4: GitHub Actions Verification (5 minutes)**

- [ ] Test CI/CD pipeline
  - Make a small change to any file
  - Commit and push: `git push origin main`
  - Go to Actions tab
  - Watch workflow run
  - Should complete in 3-5 minutes

- [ ] Verify Docker image built
  - After workflow completes
  - Go to your repository Packages section
  - Should see: `youtube-trending-system` package

---

### **Phase 5: Prepare E-Commerce Integration (5 minutes)**

- [ ] Create docker-compose for e-commerce platform
  ```bash
  # In e-commerce platform folder
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
        DATABASE_URL: ${DATABASE_URL}
  
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
  
  networks:
    default:
      driver: bridge
  EOF
  ```

- [ ] Create .env for e-commerce
  ```bash
  cat > .env << 'EOF'
  YOUTUBE_API_KEY=<paste_your_key>
  GOOGLE_SHEET_ID=<paste_your_id>
  GOOGLE_CREDENTIALS_JSON=<paste_entire_json>
  DATABASE_URL=postgres://...
  EOF
  ```

- [ ] Add .env to .gitignore
  ```bash
  echo ".env" >> .gitignore
  ```

---

### **Phase 6: First E-Commerce Deployment (10 minutes)**

- [ ] Login to GitHub Container Registry
  ```bash
  docker login ghcr.io
  # Username: YOUR_GITHUB_USERNAME
  # Password: Your GitHub personal access token
  #   (Create at Settings → Developer settings → Personal access tokens)
  ```

- [ ] Pull the image
  ```bash
  docker pull ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
  ```

- [ ] Start services
  ```bash
  docker-compose up -d
  ```

- [ ] Verify services are running
  ```bash
  docker-compose ps
  # Should show both services as "Up"
  ```

- [ ] Test YouTube Trending service
  ```bash
  curl http://localhost:8000/health
  # Should return: {"status": "healthy", ...}
  
  curl http://localhost:8000/
  # Should return: {"top3": [...]} or "No trending data yet" message
  ```

- [ ] Test E-Commerce API calls it
  ```bash
  curl http://localhost:5000/api/products/trending
  # Should return trending products from YouTube service
  ```

---

## 🔐 **Credential Security Summary**

### **What happens with credentials:**

```
Local Development:
  .env (local) → Contains secrets (never committed)
  credentials.json → Never committed (in .gitignore)

GitHub:
  Secrets stored encrypted → GitHub Secrets
  Image pushed → ghcr.io (NO credentials in image)

E-Commerce Platform:
  Docker compose .env (local) → Contains secrets
  Environment variables → Passed to container at startup
  Container accesses via os.environ → Safe runtime injection
```

### **The key principle:**

```
❌ NEVER in Docker image
❌ NEVER in Git repository  
❌ NEVER in logs
✅ ONLY in GitHub Secrets (for CI/CD)
✅ ONLY in .env (local, not committed)
✅ ONLY in environment variables (at runtime)
```

---

## 📊 **Architecture Diagram**

```
┌────────────────────────────────────────────────────────────────────┐
│ Your Local Machine                                                  │
├────────────────────────────────────────────────────────────────────┤
│  code + .gitignore → git push                                       │
│                          ↓                                          │
│                    GitHub Repository                                │
└────────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│ GitHub                                                               │
├────────────────────────────────────────────────────────────────────┤
│  Source Code Repository                                             │
│  GitHub Secrets (YOUTUBE_API_KEY, GOOGLE_SHEET_ID, etc.)           │
│  GitHub Actions CI/CD Pipeline (.github/workflows/docker-build.yml)│
│                                                                     │
│  Workflow Triggers:                                                │
│  1. Push to main branch                                             │
│  2. GitHub Actions reads GitHub Secrets                             │
│  3. Docker builds image                                             │
│  4. Image pushed to ghcr.io (NO secrets inside)                     │
│  5. GitHub packages page shows: ghcr.io/username/repo:latest        │
└────────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│ Docker Registry (ghcr.io)                                            │
├────────────────────────────────────────────────────────────────────┤
│  Image: ghcr.io/YOUR_USERNAME/youtube-trending-system:latest       │
│  - No API keys inside                                               │
│  - No credentials inside                                            │
│  - Pure application code + dependencies                             │
│  - Ready to pull into any platform                                  │
└────────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────────┐
│ E-Commerce Platform (on any server)                                 │
├────────────────────────────────────────────────────────────────────┤
│  docker-compose.yml (includes: youtube-trending service)            │
│  .env (contains actual credentials - NEVER committed)               │
│                                                                     │
│  $ docker-compose up -d                                             │
│                                                                     │
│  Microservices:                                                     │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ E-Commerce API (5000)                               │            │
│  │ ↓ calls                                              │            │
│  │ YouTube Trending Microservice (8000)                │            │
│  │   - Reads credentials from environment variables    │            │
│  │   - .env → docker-compose → container env vars      │            │
│  │   - No hardcoding, no insecurity                     │            │
│  └─────────────────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Typical Development Workflow**

### **Week 1: Initial Setup**
```bash
1. git init + git push to GitHub
2. Create GitHub Secrets (one time)
3. GitHub Actions auto-builds on first push
4. Docker image ready on ghcr.io
```

### **Week 2: Update Code**
```bash
1. Make code changes
2. git commit -m "..."
3. git push origin main
   ↓
4. GitHub Actions automatically:
   - Rebuilds image with changes
   - Pushes new version to ghcr.io
   - All previous versions still available
   - No credential re-entry needed
```

### **Week 3+: Deploy Updates**
```bash
In e-commerce platform:
1. docker-compose pull youtube-trending
2. docker-compose up -d
   ↓
3. New version deployed with fresh .env credentials
4. No code changes needed on e-commerce side
5. Only YouTube Trending service updates
```

---

## 🐛 **Troubleshooting**

### **Problem: GitHub Actions workflow fails**
```
Check: Do all 5 GitHub Secrets exist?
  Settings → Secrets and variables → Actions
  Should see all 5 secrets listed

Solution: Verify each secret value is correct
```

### **Problem: "Image not found" when pulling**
```
Check: Did the GitHub Actions workflow complete?
  Repository → Actions tab → latest run status

Check: Is the image name correct?
  Format: ghcr.io/YOUR_GITHUB_USERNAME/youtube-trending-system:latest

Check: Are you logged into GitHub Container Registry?
  $ docker login ghcr.io
```

### **Problem: Microservice can't access data**
```
Check: Is .env file in e-commerce platform folder?
  $ cat .env
  (Should show YOUTUBE_API_KEY, GOOGLE_SHEET_ID, etc.)

Check: Is .env added to .gitignore?
  $ git status
  (Should NOT show .env)

Check: Are environment variables passed to container?
  $ docker-compose config | grep YOUTUBE_API_KEY
```

### **Problem: "No trending data yet" error**
```
Reason: Pipeline hasn't run yet to generate output

Solution: 
1. SSH into container
   $ docker-compose exec youtube-trending bash

2. Run pipeline manually
   $ python run_daily_pipeline.py

3. Try API again
   $ curl http://localhost:8000/
```

---

## ✨ **What You've Accomplished**

```
✅ Source code in GitHub
✅ Secrets securely managed in GitHub Secrets
✅ Automated CI/CD pipeline (GitHub Actions)
✅ Docker image built and registered (ghcr.io)
✅ Credentials never exposed (not in image, not in git)
✅ Easy deployment as microservice
✅ E-commerce platform can use as a dependency
✅ Simple to update (just commit and push)
✅ Scaling ready (easy to run multiple instances)
✅ Production-ready architecture
```

---

## 📚 **Next Steps**

1. **Add Monitoring**: 
   - Set up health checks
   - Monitor logs and performance

2. **Add Authentication**:
   - API key for e-commerce → YouTube Trending calls
   - Rate limiting

3. **Add Caching**:
   - Cache trending results
   - Reduce API calls to YouTube

4. **Add Webhooks**:
   - Notify e-commerce when trends change
   - Trigger product updates

5. **Scale Up**:
   - Deploy multiple instances
   - Use load balancer
   - Orchestrate with Kubernetes

---

## 📞 **Quick Command Reference**

```bash
# GitHub
git push origin main                          # Push changes
git log --oneline                              # View commits

# Docker
docker-compose up -d                           # Start services
docker-compose down                            # Stop services
docker-compose logs -f youtube-trending       # View logs
docker-compose ps                              # Check status

# Testing
curl http://localhost:8000/health             # Health check
curl http://localhost:8000/                   # Get trending

# GitHub Actions
# View logs: Repository → Actions → click workflow → see logs
```

---

**You're ready to launch! 🚀**
