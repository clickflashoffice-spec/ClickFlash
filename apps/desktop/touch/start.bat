@echo off
title Touch App - Port 8091
cd /d "%~dp0"

echo ==============================================
echo   TOUCH APP - BUILD AND START
echo ==============================================
echo.

echo [1/3] Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building Backend...
call npm run build:backend
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Server...
echo.
echo App URL: http://localhost:8091
echo Press Ctrl+C to stop
echo.

npm start
