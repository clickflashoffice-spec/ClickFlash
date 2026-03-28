@echo off
setlocal enabledelayedexpansion

REM Change to the script's directory
cd /d "%~dp0"

REM ============================================================================
REM Management Portal Startup Script
REM Starts both backend and frontend servers for the Management Portal
REM ============================================================================

set "APP_NAME=Management Portal"
set "BACKEND_PORT=8093"
set "FRONTEND_PORT=5176"

echo.
echo ========================================
echo Starting %APP_NAME%
echo ========================================
echo.

REM Check if running from correct directory
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo [ERROR] Please run this script from the %APP_NAME% directory
    echo [ERROR] Expected location: apps\management\
    echo.
    pause
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH
    echo [ERROR] Please install Node.js from https://nodejs.org/
    echo [ERROR] Ensure Node.js is added to your system PATH
    echo.
    pause
    exit /b 1
)

REM Check Node.js version (requires 16+)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%

REM Check if npm is available
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found in PATH
    echo [ERROR] npm should be included with Node.js installation
    echo.
    pause
    exit /b 1
)

REM Check for port conflicts
echo [INFO] Checking for port conflicts...
netstat -ano | findstr ":%BACKEND_PORT%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port %BACKEND_PORT% is already in use
    echo [WARNING] Backend may fail to start. Close the application using this port.
    echo.
)

netstat -ano | findstr ":%FRONTEND_PORT%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port %FRONTEND_PORT% is already in use
    echo [WARNING] Frontend may fail to start. Close the application using this port.
    echo.
)

REM Check if node_modules exists, install if missing
if not exist "node_modules" (
    echo [WARNING] node_modules directory not found
    echo [INFO] Installing dependencies (this may take a few minutes)...
    echo.
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install dependencies
        echo [ERROR] Check your internet connection and try again
        echo.
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed successfully
    echo.
)

REM Verify backend server file exists
if not exist "backend\server.js" (
    echo [ERROR] Backend server file not found: backend\server.js
    echo [ERROR] Please ensure the backend directory exists
    echo.
    pause
    exit /b 1
)

REM Start Backend Server
echo [INFO] Starting %APP_NAME% Backend on port %BACKEND_PORT%...
start "Management Backend - Port %BACKEND_PORT%" cmd /k "title Management Backend && npm start"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start backend server
    echo [ERROR] Check if port %BACKEND_PORT% is available
    echo.
    pause
    exit /b 1
)

REM Wait for backend to initialize
echo [INFO] Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

REM Start Frontend Server
echo [INFO] Starting %APP_NAME% Frontend on port %FRONTEND_PORT%...
start "Management Frontend - Port %FRONTEND_PORT%" cmd /k "title Management Frontend && npm run dev"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start frontend server
    echo [ERROR] Check if port %FRONTEND_PORT% is available
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo %APP_NAME% started successfully!
echo ========================================
echo.
echo Backend:  http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo Two command windows should be open:
echo   - Management Backend (port %BACKEND_PORT%)
echo   - Management Frontend (port %FRONTEND_PORT%)
echo.
echo Press any key to close this window (servers will continue running)...
pause
