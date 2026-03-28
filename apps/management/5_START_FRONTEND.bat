@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MANAGEMENT HUB - Frontend Only
echo ===================================================
echo   Port: 5176 (Vite default)
echo ===================================================
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [WARNING] node_modules not found. Running install first...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
)

REM Check for port conflicts
netstat -ano | findstr ":5176" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 5176 is already in use!
    echo [WARNING] Please close the application using this port.
    echo.
    pause
)

echo [INFO] Starting Management Hub frontend (Vite)...
echo [INFO] Make sure backend is running on port 8092!
echo.

npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend server failed to start!
    pause
    exit /b 1
)
