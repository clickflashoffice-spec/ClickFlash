@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MASTER PORTAL - Run E2E Tests
echo ===================================================
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [WARNING] node_modules not found. Running install first...
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
)

echo [INFO] Running E2E tests with Playwright...
echo [INFO] Make sure the app is running first!
echo.

npm run test:e2e

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Some E2E tests failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   E2E Tests Complete!
echo ===================================================
pause
