# 🚀 Complete Start-to-Finish Walkthrough

**From your local machine → GitHub → Docker → E-Commerce in one guide**

---

## ⏱️ **Total Time: 45-60 minutes**

---

## **PART 1: Prepare Your GitHub Account (5 minutes)**

### Step 1: Create GitHub Account (if you don't have one)
- Go to https://github.com/signup
- Create account with email
- Verify email
- Complete setup

### Step 2: Create Personal Access Token (for Docker login)
1. Go to: https://github.com/settings/personal-access-tokens/new
2. Token name: `DockerLogin`
3. Expiration: 90 days (or longer)
4. Select scopes: Check **`write:packages`** and **`read:packages`**
5. Click "Generate token"
6. **COPY and SAVE this token** (you'll need it later)

✅ You're ready to use GitHub!

---

## **PART 2: Prepare YouTube & Google Credentials (5 minutes)**

### Step 1: Get YouTube API Key
1. Go to https://console.cloud.google.com/
2. Create new project: "youtube-trending"
3. Go to "APIs & Services" → "Library"
4. Search: "YouTube Data API v3"
5. Click "Enable"
6. Go to "Credentials" → "Create Credentials" → "API Key"
7. **COPY the API key** (you'll need this soon)

### Step 2: Get Google Sheet ID
1. Go to https://docs.google.com/spreadsheets/create
2. Create new sheet: "youtube-trending-data"
3. Get the ID from URL: `https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_ID]/edit`
4. **COPY the ID**

### Step 3: Create Service Account & Get credentials.json
1. Go back to https://console.cloud.google.com/ (same project)
2. Go to "APIs & Services" → "Credentials"
3. Click "Create Credentials" → "Service Account"
4. Name: `youtube-trending-service`
5. Click "Create and Continue"
6. Grant role: "Editor" (for Sheets access)
7. Click "Continue" and "Done"
8. Click on the service account you just created
9. Go to "Keys" tab
10. Click "Add Key" → "Create new key" → "JSON"
11. **A credentials.json file downloads automatically** - Save it in your project folder

✅ You have all credentials!

---

## **PART 3: Local Setup - Initialize Git (10 minutes)**

### Step 1: Open Terminal in Your Project Folder

```bash
# Navigate to your project
cd c:\Users\chand\Desktop\youtube-trending-system

# Verify you're in the right place
dir
# Should show: Dockerfile, README.md, requirements.txt, etc.
```

### Step 2: Initialize Git

```bash
# Initialize git
git init

# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Verify it worked
git config --list
```

### Step 3: Verify .gitignore

```bash
# Check if .gitignore exists and has the right content
cat .gitignore

# Should include:
# .env
# credentials.json
# __pycache__/
# testenv/
# etc.
```

If .gitignore is missing these, add them:
```bash
echo ".env" >> .gitignore
echo "credentials.json" >> .gitignore
```

### Step 4: Stage All Files (WITHOUT credentials)

```bash
# Stage everything
git add .

# Check what will be committed
git status

# ⚠️ IMPORTANT: Verify .env and credentials.json are NOT in the list
# They should show as "ignored" (not listed as "Changes to be committed")

# If they appear in the list, they weren't properly ignored!
# Fix: git rm --cached .env credentials.json
```

### Step 5: Create First Commit

```bash
git commit -m "Initial commit: YouTube Trending System microservice

- FastAPI server for trending products
- Pipeline for YouTube data analysis
- Docker containerization
- Ready for deployment"
```

✅ Your local code is ready!

---

## **PART 4: Push to GitHub (5 minutes)**

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `youtube-trending-system`
3. **Description**: "YouTube trend analysis microservice for e-commerce"
4. **Visibility**: Choose "Public" (easier for CI/CD) or "Private"
5. **DO NOT** check "Initialize with README" (you already have one)
6. Click **"Create repository"**

### Step 2: Connect Local to GitHub

```bash
# Copy from GitHub (you'll see this after creating repo)
git remote add origin https://github.com/YOUR_USERNAME/youtube-trending-system.git

# Verify
git remote -v
# Should show: origin https://github.com/YOUR_USERNAME/youtube-trending-system.git
```

### Step 3: Push to GitHub

```bash
# Set branch to main and push
git branch -M main
git push -u origin main

# This uploads everything to GitHub
# Takes 10-20 seconds
```

### Step 4: Verify on GitHub.com

1. Go to https://github.com/YOUR_USERNAME/youtube-trending-system
2. Verify you see:
   - ✅ All source files
   - ✅ Dockerfile
   - ✅ README.md
   - ❌ NO .env file
   - ❌ NO credentials.json file

✅ Your code is on GitHub!

---

## **PART 5: Add GitHub Secrets (5 minutes)**

### Step 1: Navigate to Secrets

1. Go to: Your GitHub repository
2. Click: **Settings**
3. Click: **Secrets and variables** (left sidebar)
4. Click: **Actions**

### Step 2: Create 5 Secrets

**Secret 1: YOUTUBE_API_KEY**
- Click "New repository secret"
- Name: `YOUTUBE_API_KEY`
- Value: Paste your YouTube API key (from Part 2, Step 1)
- Click "Add secret"

**Secret 2: GOOGLE_SHEET_ID**
- Click "New repository secret"
- Name: `GOOGLE_SHEET_ID`
- Value: Paste your Google Sheet ID (from Part 2, Step 2)
- Click "Add secret"

**Secret 3: GOOGLE_CREDENTIALS_JSON**
- Click "New repository secret"
- Name: `GOOGLE_CREDENTIALS_JSON`
- Value: Open the `credentials.json` file you downloaded
  - Copy entire contents (starts with `{` and ends with `}`)
  - Paste into secret value
- Click "Add secret"

**Secret 4: DOCKER_HUB_USERNAME** (Optional)
- If you have Docker Hub account
- Name: `DOCKER_HUB_USERNAME`
- Value: Your Docker Hub username
- Click "Add secret"

**Secret 5: DOCKER_HUB_TOKEN** (Optional)
- If you have Docker Hub account
- Name: `DOCKER_HUB_TOKEN`
- Value: Your Docker Hub access token
- Click "Add secret"

### Step 3: Verify Secrets

- Go back to Secrets page
- Should see all secrets listed (names only, values hidden for security)

✅ Secrets are secured!

---

## **PART 6: GitHub Actions Auto-Build (5 minutes)**

### Step 1: Trigger the Build

```bash
# Make a small change to verify workflow
cd c:\Users\chand\Desktop\youtube-trending-system

# Edit a file (any change to trigger build)
echo "# Updated on $(date)" >> README.md

# Commit and push
git add .
git commit -m "Trigger GitHub Actions build"
git push origin main

# This triggers the workflow
```

### Step 2: Watch the Build

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. Click the latest workflow run (titled "Build and Push Docker Image")
4. Watch it run (takes 3-5 minutes)

**What you'll see:**
- ✅ "Checkout code"
- ✅ "Set up Docker Buildx"
- ✅ "Log in to GitHub Container Registry"
- ✅ "Build and push Docker image" (this is the longest step)
- ✅ "Image digest"

When all steps show ✅, the image is built!

### Step 3: Verify Image was Built

1. Go to your repository home page
2. Look for **"Packages"** on the right sidebar
3. Click on it
4. Should see: `youtube-trending-system` package
5. Click on package → Should see tags like `latest`, `main`, `sha-xxxxx`

✅ Docker image is built and ready!

---

## **PART 7: Prepare E-Commerce Platform (5 minutes)**

### Step 1: Create E-Commerce Folder

```bash
# Create a new folder for your e-commerce platform
mkdir c:\Users\chand\Desktop\ecommerce-with-trending
cd c:\Users\chand\Desktop\ecommerce-with-trending
```

### Step 2: Create docker-compose.yml

```bash
# Create the file
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Main E-Commerce API
  ecommerce-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ecommerce-api
    ports:
      - "5000:5000"
    environment:
      YOUTUBE_TRENDING_API_URL: http://youtube-trending:8000
    depends_on:
      - youtube-trending
    networks:
      - ecommerce-net
    restart: unless-stopped

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

volumes:
  trending_storage:
  trending_output:
  trending_logs:

networks:
  ecommerce-net:
    driver: bridge
EOF
```

### Step 3: Create .env File

```bash
# Replace YOUR_USERNAME with your actual GitHub username
cat > .env << 'EOF'
YOUTUBE_API_KEY=<paste_your_youtube_api_key>
GOOGLE_SHEET_ID=<paste_your_google_sheet_id>
GOOGLE_CREDENTIALS_JSON=<paste_entire_credentials.json_content>
EOF
```

**Example .env:**
```
YOUTUBE_API_KEY=AIzaSyD...abc123...
GOOGLE_SHEET_ID=1A2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"youtube-trending","private_key":"-----BEGIN PRIVATE KEY-----\n...base64 encoded key...\n-----END PRIVATE KEY-----\n","client_email":"service-account@project.iam.gserviceaccount.com"}
```

### Step 4: Create .gitignore

```bash
cat > .gitignore << 'EOF'
.env
credentials.json
__pycache__/
*.pyc
.DS_Store
.idea/
*.log
EOF
```

✅ E-Commerce folder is ready!

---

## **PART 8: Docker Login & Pull Image (5 minutes)**

### Step 1: Login to GitHub Container Registry

```bash
# This is the first time you need Docker
# Make sure Docker Desktop is running

# Login
docker login ghcr.io

# When prompted:
# Username: YOUR_GITHUB_USERNAME
# Password: Paste the personal access token you created in Part 1, Step 2
```

### Step 2: Verify Login

```bash
# Check if login worked
docker info | grep Username

# Or try to pull the image
docker pull ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
```

### Step 3: Update docker-compose.yml

In the docker-compose.yml you created, find this line:

```yaml
image: ghcr.io/YOUR_USERNAME/youtube-trending-system:latest
```

Replace `YOUR_USERNAME` with your actual GitHub username.

✅ Ready to start containers!

---

## **PART 9: Start Services (5 minutes)**

### Step 1: Start the Services

```bash
# Navigate to e-commerce folder
cd c:\Users\chand\Desktop\ecommerce-with-trending

# Pull the latest image
docker-compose pull youtube-trending

# Start all services
docker-compose up -d

# Wait 10-15 seconds for startup
```

### Step 2: Check Status

```bash
# Check if containers are running
docker-compose ps

# You should see:
# NAME                    STATUS
# ecommerce-api           Up (healthy)
# youtube-trending-api    Up (healthy)

# If they're not running:
docker-compose logs youtube-trending
docker-compose logs ecommerce-api
```

✅ Services are running!

---

## **PART 10: Test Everything (5 minutes)**

### Step 1: Test YouTube Trending Service

```bash
# Test health check
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","timestamp":"2026-04-30T...","service":"youtube-trending-api"}
```

### Step 2: Get Trending Data

```bash
# Get trending products
curl http://localhost:8000/

# Expected response (first time):
# {"message":"No trending data yet."}

# Or (if data exists):
# {"top3":[{"Keyword":"iPhone","GrowthRate":1.45},...]}
```

### Step 3: Test E-Commerce API

```bash
# If you have an e-commerce API that calls YouTube Trending:
curl http://localhost:5000/api/products/trending

# Should return: Trending products from YouTube service
```

### Step 4: View Logs

```bash
# View YouTube Trending logs
docker-compose logs youtube-trending

# Follow logs in real-time
docker-compose logs -f youtube-trending

# Press Ctrl+C to stop following logs
```

✅ Everything is working!

---

## **PART 11: Generate Trending Data (Optional, 5 minutes)**

If you want to see actual trending data instead of "No trending data yet":

### Step 1: Run Pipeline Manually

```bash
# Access the YouTube Trending container
docker-compose exec youtube-trending bash

# Inside the container, run:
python run_daily_pipeline.py

# This fetches YouTube data and generates trends
# Takes 30-60 seconds

# Exit container
exit
```

### Step 2: Check Results

```bash
# Now try the API again
curl http://localhost:8000/

# Should show actual trending data:
# {"top3":[...]}
```

✅ You have trending data!

---

## **PART 12: Update Your Code (Going Forward)**

When you want to make changes:

### Workflow for Updates

```bash
# 1. Make code changes in youtube-trending-system folder
cd c:\Users\chand\Desktop\youtube-trending-system
vim app/main.py  # Make your changes

# 2. Test locally
docker-compose up -d  # in ecommerce folder
curl http://localhost:8000/

# 3. Commit and push
git add .
git commit -m "Feature: Added something new"
git push origin main

# 4. GitHub Actions auto-builds (watch Actions tab)

# 5. Update in e-commerce
cd c:\Users\chand\Desktop\ecommerce-with-trending
docker-compose pull youtube-trending
docker-compose up -d youtube-trending

# Done! New version running
```

---

## 📋 **Command Reference - Keep This Handy**

```bash
# ===== GIT COMMANDS =====
git init                           # Initialize git
git add .                          # Stage files
git commit -m "message"            # Create commit
git push origin main               # Push to GitHub
git status                         # Check status
git log --oneline                  # View commits

# ===== DOCKER COMMANDS =====
docker login ghcr.io               # Login to registry
docker pull ghcr.io/user/repo      # Pull image
docker-compose up -d               # Start services
docker-compose down                # Stop services
docker-compose ps                  # Check status
docker-compose logs -f service     # View logs
docker-compose exec service bash   # Access container

# ===== TESTING =====
curl http://localhost:8000/health  # Health check
curl http://localhost:8000/        # Get trending
curl http://localhost:5000/        # E-commerce API
```

---

## ✅ **Success Checklist**

After following all steps, you should have:

- ✅ GitHub account created
- ✅ YouTube API key obtained
- ✅ Google Sheet created
- ✅ credentials.json downloaded
- ✅ Code pushed to GitHub
- ✅ GitHub Secrets configured (5 secrets)
- ✅ GitHub Actions workflow running ✅ PASSED
- ✅ Docker image built (ghcr.io)
- ✅ E-Commerce folder setup with docker-compose
- ✅ Services running locally
- ✅ Health checks passing
- ✅ Trending data being served
- ✅ Ready for production deployment

---

## 🎯 **Next: Deploy to Production**

Once you've verified everything works locally, you can:

1. **Deploy to AWS EC2** - Run containers on cloud server
2. **Deploy to Kubernetes** - Scale to multiple instances
3. **Deploy to Docker Swarm** - Orchestrate multiple services
4. **Add monitoring** - Monitor logs and performance
5. **Add caching** - Improve response times
6. **Add authentication** - Secure your API

---

## 🆘 **Troubleshooting Quick Answers**

**Q: "Command not found: git"**
A: Install Git from https://git-scm.com/download/win

**Q: "Docker daemon is not running"**
A: Open Docker Desktop application

**Q: "Image not found"**
A: Check GitHub Actions workflow completed ✅
   Check image name is correct with YOUR_USERNAME

**Q: "Connection refused"**
A: Check `docker-compose ps` - services running?
   Run `docker-compose up -d` to start them

**Q: "No trending data yet"**
A: Run pipeline: `docker-compose exec youtube-trending python run_daily_pipeline.py`

**Q: "Permission denied"**
A: On Windows, usually Docker Desktop permission issue
   Restart Docker Desktop

---

## 🎉 **Congratulations!**

You've successfully:
1. Set up GitHub
2. Configured credentials securely
3. Created automated CI/CD pipeline
4. Built Docker image
5. Deployed as microservice
6. Integrated with e-commerce platform

**Your YouTube Trending System is now:**
- ✅ On GitHub (version controlled)
- ✅ Auto-building (GitHub Actions)
- ✅ In Docker registry (ghcr.io)
- ✅ Running as microservice (docker-compose)
- ✅ Secure (credentials not in image)
- ✅ Production-ready

---

**You're done! Your system is live and ready to serve trending data to your e-commerce platform! 🚀**

---

## 📚 **For More Details**

- Docker questions? → See DOCKER_SETUP.md
- Credentials questions? → See CREDENTIAL_MANAGEMENT.md
- Integration questions? → See INTEGRATION_EXAMPLES.md
- Architecture questions? → See MICROSERVICE_DEPLOYMENT.md
- Need a quick reference? → See QUICK_START.md
