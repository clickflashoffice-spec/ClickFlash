@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CUSTOMER GALLERY - Development Mode
echo ===================================================
echo   Backend Port: 8093
echo   Frontend Port: 5175 (Vite default)
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
netstat -ano | findstr ":8093" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 8093 is already in use!
    echo [WARNING] Backend may fail to start. Close the application using this port.
    echo.
)

netstat -ano | findstr ":5175" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 5175 is already in use!
    echo [WARNING] Frontend may fail to start. Close the application using this port.
    echo.
)

REM Verify backend server file exists
if not exist "backend\server.js" (
    echo [ERROR] Backend server file not found: backend\server.js
    pause
    exit /b 1
)

echo [INFO] Starting Customer Gallery servers...
echo.

REM Start Backend Server in new window
echo [INFO] Starting Backend on port 8093...
start "Gallery Backend - Port 8093" cmd /k "title Gallery Backend && npm start"

REM Wait for backend to initialize
timeout /t 3 /nobreak >nul

REM Start Frontend Server in new window
echo [INFO] Starting Frontend on port 5175...
start "Gallery Frontend - Port 5175" cmd /k "title Gallery Frontend && npm run dev"

echo.
echo ===================================================
echo   Customer Gallery started successfully!
echo ===================================================
echo.
echo Backend:  http://localhost:8093
echo Frontend: http://localhost:5175
echo.
echo Two command windows should be open:
echo   - Gallery Backend (port 8093)
echo   - Gallery Frontend (port 5175)
echo.
echo Press any key to close this window (servers will continue running)...
pause
