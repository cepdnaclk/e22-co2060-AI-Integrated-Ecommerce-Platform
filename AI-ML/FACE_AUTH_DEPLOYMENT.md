# Admin Auth + Face Recognition — Deployment Guide

## Architecture

```
Admin Browser
     ↓
Node.js Backend (port 3000)   ←── FACE_RECOGNITION_ENABLED flag
     ↓ (if face enabled)
Python Face Service (port 5000) ←── DeepFace + SFace model
```

## Feature Flag

In `Backend/backend-inter/.env`:

```env
# Set to "true" to enable face recognition as 2nd factor
FACE_RECOGNITION_ENABLED=false

# URL of the Python face service
FACE_SERVICE_URL=http://localhost:5000

# Cosine similarity threshold (0.0 – 1.0)
FACE_SIMILARITY_THRESHOLD=0.45
```

**If `false`**: Login is email + password only. No face code runs.
**If `true`**: Admins with enrolled faces must verify via webcam after password.

---

## Quick Start (Local)

### 1. Start Python Face Service (only if face enabled)

```bash
cd AI-ML
pip install -r face_requirements.txt
uvicorn app:app --host 0.0.0.0 --port 5000 --workers 1
```

The SFace model downloads on first startup (~50 MB).

### 2. Start Node.js Backend

```bash
cd Backend/backend-inter
npm install
node index.js
```

### 3. Start Frontend

```bash
cd Frontend/my-react-app
npm install
npm run dev
```

### 4. Enroll Admin Face (optional)

After logging in as admin, call:

```
POST /api/admin/auth/register-face
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "faceImage": "<base64-encoded-jpeg>" }
```

---

## API Endpoints

### Auth (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Email + password login |
| POST | `/api/admin/auth/verify-face` | Face verification (step 2) |

### Auth (Admin Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/auth/verify` | Validate session token |
| POST | `/api/admin/auth/logout` | Invalidate session |
| POST | `/api/admin/auth/create` | Create new admin |
| POST | `/api/admin/auth/register-face` | Enroll/update face |
| DELETE | `/api/admin/auth/remove-face` | Remove face data |
| GET | `/api/admin/auth/face-status` | Check face config |
| GET | `/api/admin/auth/login-logs` | Audit trail |

### Face Service (Python, internal)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/generate-embedding` | Generate 128-d vector |
| POST | `/verify-face` | Compare live vs stored |
| POST | `/cache/clear` | Clear embedding cache |

---

## Login Flow

```
1. User enters email + password
2. Backend validates credentials (bcrypt)
3. If FACE_RECOGNITION_ENABLED=false → issue JWT → done
4. If FACE_RECOGNITION_ENABLED=true AND admin has face enrolled:
   a. Issue short-lived pendingToken (5 min)
   b. Frontend activates webcam
   c. Capture frame → send to /verify-face
   d. Backend calls Python service for cosine similarity
   e. If similarity ≥ threshold → issue full JWT → done
5. If admin has NO face enrolled → skip face → issue JWT
```

---

## Security Features

- **bcrypt** password hashing (salt: 12)
- **JWT** sessions (8h expiry, 5m for pending face tokens)
- **Rate limiting**: 5 attempts per IP per 15-minute window
- **Login audit log**: Every attempt logged with IP, device, face result
- **Face embedding** stored as number array on User model (nullable)
- Admin role check happens before password verification
- Blocked account detection

---

## VPS Deployment (1 GB RAM)

### Python Service (optimize RAM)

```bash
# Use headless OpenCV (no GUI libs)
pip install opencv-python-headless

# Run with 1 worker only
uvicorn app:app --host 127.0.0.1 --port 5000 --workers 1

# Expected RAM: ~200-350 MB after model load
```

### Process Manager (PM2)

```bash
# Node.js
pm2 start Backend/backend-inter/index.js --name admin-api

# Python
pm2 start "uvicorn app:app --host 127.0.0.1 --port 5000 --workers 1" \
  --name face-service --cwd AI-ML --interpreter python3
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name admin.yourdomain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location / {
        root /var/www/frontend/dist;
        try_files $uri /index.html;
    }
}
```

> **Tip**: The Python face service should only be accessible from localhost
> (127.0.0.1), never exposed publicly. The Node.js server proxies to it.

---

## File Structure

```
AI-ML/
  app.py                  ← FastAPI face service
  face_engine.py          ← DeepFace SFace wrapper
  embedding_cache.py      ← In-memory embedding cache
  face_requirements.txt   ← Python dependencies

Backend/backend-inter/
  .env                    ← FACE_RECOGNITION_ENABLED flag
  controllers/
    adminAuthController.js  ← Login + face verify + audit logs
  services/
    faceService.js          ← Modular face service client
  models/
    user.js                 ← Added faceEmbedding field
    adminLoginLog.js        ← Login audit model
  router/
    adminAuthRouter.js      ← New face routes

Frontend/my-react-app/src/pages/
  AdminLogin.jsx            ← Webcam + face verify UI
```

---

## Disabling Face Recognition

Set `FACE_RECOGNITION_ENABLED=false` in `.env` and restart the Node server.
No other changes needed — the Python service doesn't need to be running.
