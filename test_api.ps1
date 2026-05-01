# ============================================================================
# API Testing Script - Test the YouTube Trending ML API (PowerShell)
# ============================================================================
# Usage: .\test_api.ps1 -Port 8000
# Or: .\test_api.ps1 -Port 5000

param(
    [int]$Port = 8000
)

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "YouTube Trending ML API - Testing Script (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Testing API on port: $Port" -ForegroundColor Yellow
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url
    )
    
    Write-Host "[$Name]" -ForegroundColor Green
    Write-Host "GET $Url"
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -ErrorAction Stop
        $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    }
    catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host ""
}

# Test 1: Root Endpoint
Test-Endpoint "TEST 1: Root Endpoint" "http://localhost:$Port/"

# Test 2: Health Check
Test-Endpoint "TEST 2: Health Check" "http://localhost:$Port/health"

# Test 3: Trending Data
Test-Endpoint "TEST 3: Get Top 3 Trending Products" "http://localhost:$Port/api/trending"

# Test 4: Detailed Trending Data
Test-Endpoint "TEST 4: Detailed Trending Data" "http://localhost:$Port/api/trending/detailed"

# Test 5: API Documentation
Write-Host "[TEST 5: API Documentation URLs]" -ForegroundColor Green
Write-Host ""
Write-Host "   Swagger UI:      http://localhost:$Port/docs" -ForegroundColor Cyan
Write-Host "   ReDoc:           http://localhost:$Port/redoc" -ForegroundColor Cyan
Write-Host "   OpenAPI Schema:  http://localhost:$Port/openapi.json" -ForegroundColor Cyan
Write-Host ""

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
