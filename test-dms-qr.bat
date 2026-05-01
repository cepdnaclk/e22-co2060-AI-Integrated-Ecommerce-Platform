@echo off
REM DMS QR Scanner Flow E2E Test Script
REM This script runs all the test steps sequentially

setlocal enabledelayedexpansion

set BACKEND_DIR=d:\AI-ML-2yp\e22-co2060-AI-Integrated-Ecommerce-Platform\Backend\backend-inter
set API_BASE=http://localhost:3000/api
set PORT=3000
set NODE_PID=

echo.
echo ============================================================
echo   DMS QR SCANNER FLOW E2E TEST
echo ============================================================
echo.

REM Step 1: Navigate
echo ============================================================
echo   STEP 1: Navigate to Backend Directory
echo ============================================================
cd /d "%BACKEND_DIR%" || goto error
echo Current dir: %CD%
echo.

REM Step 2: Check node_modules
echo ============================================================
echo   STEP 2: Check Dependencies
echo ============================================================
if exist "node_modules" (
  echo [OK] node_modules already exists
) else (
  echo [INFO] Installing npm dependencies...
  call npm install
  if !errorlevel! neq 0 (
    echo [ERROR] npm install failed
    goto error
  )
)
echo.

REM Step 3: Start server in background
echo ============================================================
echo   STEP 3: Start Node.js Server (background)
echo ============================================================
echo [INFO] Starting: node index.js
REM Start server in a separate process and capture PID
start "NodeServer" /D "%BACKEND_DIR%" node index.js
REM Give server time to start
timeout /t 3 /nobreak
echo [OK] Server started
echo.

REM Step 4: Verify port listening
echo ============================================================
echo   STEP 4: Verify Port 3000 Listening
echo ============================================================
echo [INFO] Waiting for port 3000...
REM Simple test using node to check port
node -e "const http = require('http'); let attempts = 0; const check = () => { const req = http.request('http://localhost:3000/', (res) => { console.log('[OK] Port 3000 is listening'); process.exit(0); }); req.on('error', () => { attempts++; if (attempts < 15) { setTimeout(check, 1000); } else { console.log('[ERROR] Port not listening'); process.exit(1); } }); req.end(); }; check();"
if !errorlevel! neq 0 (
  echo [ERROR] Server not listening
  goto cleanup
)
echo.

REM Step 5: Login
echo ============================================================
echo   STEP 5: Login and Get Token
echo ============================================================
echo [INFO] POSTing to /api/auth/login/password...
REM Create a node script for the login test
node -e "const http = require('http'); const data = JSON.stringify({email:'center01.manager@dms-sample.lk', password:'Center01@123'}); const opts = {hostname:'localhost', port:3000, path:'/api/auth/login/password', method:'POST', headers:{'Content-Type':'application/json','Content-Length':data.length}}; const req = http.request(opts, (res) => {let body=''; res.on('data', (chunk) => body += chunk); res.on('end', () => {console.log('[Status] ' + res.statusCode); console.log('[Body] ' + body); process.exit(0);})}); req.on('error', (e) => {console.log('[ERROR] ' + e.message); process.exit(1);}); req.write(data); req.end();"
echo.

echo ============================================================
echo   TEST EXECUTION COMPLETED
echo ============================================================

REM Cleanup
:cleanup
echo.
echo [INFO] Stopping background processes...
taskkill /FI "WindowTitle eq NodeServer" /T /F 2>nul
echo [OK] Cleanup complete
endlocal
goto end

:error
echo [ERROR] Test failed
endlocal
exit /b 1

:end
exit /b 0
