@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CUSTOMER GALLERY - Backend Only
echo ===================================================
echo   Port: 8093
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

REM Verify backend server file exists
if not exist "backend\server.js" (
    echo [ERROR] Backend server file not found: backend\server.js
    pause
    exit /b 1
)

REM Check for port conflicts
netstat -ano | findstr ":8093" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 8093 is already in use!
    echo [WARNING] Please close the application using this port.
    echo.
    pause
)

echo [INFO] Starting Customer Gallery backend server...
echo.

npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server crashed or failed to start!
    echo [INFO] Check the error messages above.
    pause
)
