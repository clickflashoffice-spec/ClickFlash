@echo off
title Touch App - Build Only
cd /d "%~dp0"

echo ==============================================
echo   TOUCH APP - BUILD ONLY
echo ==============================================
echo.

echo [1/2] Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Building Backend...
call npm run build:backend
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b 1
)

echo.
echo ==============================================
echo   BUILD COMPLETE
echo ==============================================
echo.
echo Run start.bat to start the server
echo.
pause
