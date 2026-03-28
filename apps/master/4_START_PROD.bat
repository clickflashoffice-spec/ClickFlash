@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MASTER PORTAL - Production Mode
echo ===================================================
echo   Port: 8090
echo ===================================================
echo.

REM Check dist folder
if not exist "dist\backend\server.js" (
    echo [WARNING] Production build not found. Building first...
    call npm run build
    call npm run build:backend
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Build failed!
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
    pause
)

echo [INFO] Starting Master Portal production server...
echo.

npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server crashed or failed to start!
    echo [INFO] Check the error messages above.
    pause
)
