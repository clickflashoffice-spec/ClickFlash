@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MASTER PORTAL - Development Mode
echo ===================================================
echo   Backend (Express): 8090
echo   Frontend (Vite):   5173
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

REM Check for port conflicts
netstat -ano | findstr ":8090" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 8090 is already in use!
    echo [WARNING] Please close the application using this port.
    echo.
)

echo [INFO] Starting Master Portal in development mode...
echo [INFO] This will start both backend and frontend servers.
echo.

npm run dev:full

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Development server failed to start!
    pause
    exit /b 1
)
