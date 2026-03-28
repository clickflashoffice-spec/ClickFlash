@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CLICKFLASH ECOSYSTEM - Start Local Apps
echo ===================================================
echo.
echo Local Applications:
echo   1. Master Station   (Backend: 8090, Frontend: 5173)
echo   2. Touch Kiosk       (Backend: 8091, Frontend: 5174)
echo   3. Money Trash       (Port 3000)
echo.
echo Cloud Apps (Management, Gallery, Website) are deployed
echo via deploy_ecosystem.ps1 and run on Cloudflare.
echo.
echo Press Ctrl+C to cancel, or
echo.
pause

echo.
echo ===================================================
echo   Starting local applications...
echo ===================================================
echo.

REM ================================================
REM 1. Master Station (Electron + Backend)
REM ================================================
echo [1/3] Starting Master Station...
if exist "apps\master" (
    start "Master Station" cmd /c "cd /d "%~dp0\apps\master" ^&^& call 3_START_DEV.bat"
    timeout /t 5 /nobreak >nul
) else (
    echo [WARNING] Master Station not found at apps\master
)

REM ================================================
REM 2. Touch Kiosk (Electron + Backend)
REM ================================================
echo [2/3] Starting Touch Kiosk...
if exist "apps\touch" (
    start "Touch Kiosk" cmd /c "cd /d "%~dp0\apps\touch" ^&^& call start.bat"
    timeout /t 5 /nobreak >nul
) else (
    echo [WARNING] Touch Kiosk not found at apps\touch
)

REM ================================================
REM 3. Money Trash Uploader (Next.js - Local Lead Capture)
REM ================================================
echo [3/3] Starting Money Trash Uploader...
if exist "apps\moneytrash" (
    start "Money Trash" cmd /k "cd /d "%~dp0\apps\moneytrash" ^&^& npm run dev"
    timeout /t 3 /nobreak >nul
) else (
    echo [WARNING] Money Trash not found at apps\moneytrash
)

echo.
echo ===================================================
echo   All local applications started!
echo ===================================================
echo.
echo Local services:
echo   Master Station:   http://localhost:8090 (API) / http://localhost:5173 (UI)
echo   Touch Kiosk:      http://localhost:8091 (API) / http://localhost:5174 (UI)
echo   Money Trash:      http://localhost:3000
echo.
echo Cloud services (deploy via deploy_ecosystem.ps1):
echo   Management Hub:   https://clickflash-hub.pages.dev/manage
echo   Customer Gallery: https://clickflash-hub.pages.dev/gallery
echo   Main Website:     https://clickflash-hub.pages.dev
echo.
pause
