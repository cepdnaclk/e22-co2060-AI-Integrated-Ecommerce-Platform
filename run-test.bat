@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  PYTHON DEPENDENCY CHECK AND TEST EXECUTION
echo ============================================================

REM Step 1: Check Python version
echo.
echo [STEP 1] Checking Python version...
python --version
if errorlevel 1 (
    echo ERROR: Python not found or version check failed
    exit /b 1
)

REM Step 2: Check installed packages
echo.
echo [STEP 2] Checking installed packages...
python -m pip list 2>&1 | findstr /E "(requests|pymongo)"
set PACKAGES_CHECK=%errorlevel%

REM Step 3: Install missing packages
echo.
echo [STEP 3] Installing missing dependencies...

python -m pip list 2>&1 | findstr "requests" >nul
if errorlevel 1 (
    echo Installing requests...
    python -m pip install requests
    if errorlevel 1 (
        echo ERROR: Failed to install requests
        exit /b 1
    )
    echo ✓ requests installed
) else (
    echo ✓ requests already installed
)

python -m pip list 2>&1 | findstr "pymongo" >nul
if errorlevel 1 (
    echo Installing pymongo...
    python -m pip install pymongo
    if errorlevel 1 (
        echo ERROR: Failed to install pymongo
        exit /b 1
    )
    echo ✓ pymongo installed
) else (
    echo ✓ pymongo already installed
)

REM Step 4: Run test script
echo.
echo [STEP 4] Running test script...
cd /d D:\AI-ML-2yp\e22-co2060-AI-Integrated-Ecommerce-Platform
python test-dms-qr.py

REM Capture exit code
set TEST_EXIT_CODE=%errorlevel%

echo.
echo ============================================================
echo  TEST EXECUTION COMPLETED
echo ============================================================
if %TEST_EXIT_CODE% equ 0 (
    echo Result: PASSED
) else (
    echo Result: FAILED (exit code: %TEST_EXIT_CODE%)
)

exit /b %TEST_EXIT_CODE%
