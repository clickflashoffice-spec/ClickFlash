@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MAIN WEBSITE - Production Mode
echo ===================================================
echo   Port: 3001
echo ===================================================
echo.

REM Check build folder
if not exist ".next" (
    echo [WARNING] Production build not found. Building first...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Build failed!
        pause
        exit /b 1
    )
)

REM Check for port conflicts
netstat -ano | findstr ":3001" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 3001 is already in use!
    echo [WARNING] Please close the application using this port.
    echo.
    pause
)

echo [INFO] Starting Main Website production server...
echo.

npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server crashed or failed to start!
    echo [INFO] Check the error messages above.
    pause
)
