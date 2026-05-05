# Railway Deployment Setup Guide

## Problem Fixed
**Login redirection was failing with 502 errors** because the frontend container's nginx couldn't reach the backend API.

## Root Cause
The `nginx.conf` template was trying to proxy requests to the backend using `$BACKEND_INTERNAL_HOST` environment variable, but this wasn't being set, resulting in `http://` (empty host) and causing 502 Bad Gateway errors.

## Solution

### 1. Updated nginx.conf (Frontend)
- Added a **fallback default** for `BACKEND_INTERNAL_HOST` to `backend:3000`
- Added missing `X-Forwarded-Auth` header to forward Authorization headers properly
- Added proxy timeouts to handle slow backend responses
- Environment variable syntax: `${BACKEND_INTERNAL_HOST:-backend:3000}`

### 2. Improved Login Error Handling (Frontend)
- Better error messages for 502/503 errors
- Clearer feedback about connection issues
- Helpful hints for troubleshooting

## Railway Deployment Steps

### For Frontend Service:
1. **Build & Deploy**
   - Source: `Frontend/my-react-app`
   - Build command: `npm install --legacy-peer-deps && npm run build`
   - Start command: Leave empty (uses Dockerfile CMD)
   - Port: `80`

2. **Environment Variables** (set these in Railway dashboard):
   ```
   BACKEND_INTERNAL_HOST=<backend-service-host>:3000
   ```
   
   **To find the correct value:**
   - Go to your Backend service in Railway
   - Get the internal hostname from the "Connect" tab
   - Format: `backend-internal-hostname:3000`
   - Example: `backend.railway.internal:3000`

### For Backend Service:
1. **Build & Deploy**
   - Source: `Backend/backend-inter`
   - Build command: `npm install --legacy-peer-deps`
   - Start command: `npm start`
   - Port: `3000`

2. **Required Environment Variables:**
   ```
   PORT=3000
   JWT_SECRET=<your-jwt-secret>
   MONGO_URI=<your-mongodb-connection-string>
   FRONTEND_URL=https://<your-frontend-domain>
   ```

## How It Works

### Locally (Docker Compose):
```
Browser → Frontend (Vite dev server)
       → Vite proxy → http://backend:3000
       → Backend API responses
```

### On Railway (Production):
```
Browser → Frontend (Nginx) 
       → Nginx proxy → http://BACKEND_INTERNAL_HOST/api/
       → Backend API responses
```

## Testing the Fix

1. **Check Nginx Configuration:**
   - SSH into frontend container
   - Run: `cat /etc/nginx/conf.d/default.conf`
   - Verify `proxy_pass` shows the correct backend URL

2. **Test Backend Connectivity:**
   ```bash
   curl -H "Authorization: Bearer <firebase-token>" \
        https://your-frontend.railway.app/api/auth/login \
        -X POST
   ```

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for success/error logs from login flow
   - Should see: `✅ Backend session synced` on success

## If Still Getting 502 Errors

1. **Verify `BACKEND_INTERNAL_HOST` is set** in Railway environment
2. **Check backend service is running** and healthy
3. **Check firewall rules** allow internal communication
4. **Look at backend logs** for authentication errors
5. **Increase nginx timeout** if backend response is slow:
   - Edit `proxy_read_timeout 60s` to higher value if needed

## Frontend Response on Login Success

The login flow now works as:
1. User enters credentials
2. Firebase authenticates user
3. Frontend calls `/api/auth/login` with Firebase token
4. Backend verifies token and issues JWT
5. **Success animation displays** (2 seconds)
6. **Redirects to home page** (`/`)

If API call fails, user sees clear error message instead of infinite loop.
