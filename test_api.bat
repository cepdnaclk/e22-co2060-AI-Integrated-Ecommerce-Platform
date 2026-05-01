@echo off
REM ============================================================================
REM API Testing Script - Test the YouTube Trending ML API
REM ============================================================================
REM Usage: test_api.bat [port]
REM Example: test_api.bat 8000

setlocal enabledelayedexpansion

REM Get port from argument or use default
set PORT=%1
if "%PORT%"=="" (
    set PORT=8000
)

echo.
echo ============================================================================
echo YouTube Trending ML API - Testing Script
echo ============================================================================
echo Testing API on port: %PORT%
echo.

REM Test 1: Root Endpoint
echo [TEST 1] Root Endpoint
echo GET http://localhost:%PORT%/
curl -s http://localhost:%PORT%/ | python -m json.tool
echo.
echo.

REM Test 2: Health Check
echo [TEST 2] Health Check
echo GET http://localhost:%PORT%/health
curl -s http://localhost:%PORT%/health | python -m json.tool
echo.
echo.

REM Test 3: Trending Data
echo [TEST 3] Get Top 3 Trending Products
echo GET http://localhost:%PORT%/api/trending
curl -s http://localhost:%PORT%/api/trending | python -m json.tool
echo.
echo.

REM Test 4: Detailed Trending Data
echo [TEST 4] Detailed Trending Data
echo GET http://localhost:%PORT%/api/trending/detailed
curl -s http://localhost:%PORT%/api/trending/detailed | python -m json.tool
echo.
echo.

REM Test 5: API Documentation
echo [TEST 5] API Documentation URLs
echo.
echo   Swagger UI: http://localhost:%PORT%/docs
echo   ReDoc: http://localhost:%PORT%/redoc
echo   OpenAPI Schema: http://localhost:%PORT%/openapi.json
echo.
echo ============================================================================
echo Testing Complete!
echo ============================================================================
echo.
pause
