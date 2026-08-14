@echo off
setlocal enabledelayedexpansion

:: ===================================================
::   CLICKFLASH MASTER STATION - PC SETUP
::   Configures Firewall, Kiosk Mode, and Network
:: ===================================================

cd /d "%~dp0"

echo ===================================================
echo   CLICKFLASH - Master Station PC Setup
echo ===================================================
echo.
echo This script will:
echo   1. Configure Windows Firewall (ports 8090, 8091, 5353)
echo   2. Set up Kiosk mode (optional)
echo   3. Verify network configuration
echo   4. Create data directories
echo.
echo Press Ctrl+C to cancel, or
echo.
pause

:: Request Elevation
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ===================================================
echo   [1/4] FIREWALL CONFIGURATION
echo ===================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0setup_firewall.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Firewall setup encountered issues.
) else (
    echo [OK] Firewall configured.
)

echo.
echo ===================================================
echo   [2/4] KIOSK MODE SETUP
echo ===================================================
echo.
echo Choose kiosk mode:
echo   1. Web Kiosk (Chrome) - Recommended for testing
echo   2. Electron Kiosk - For production deployment
echo   3. Skip - No kiosk mode
echo.
set /p KIOSK_CHOICE="Enter choice (1/2/3): "

if "%KIOSK_CHOICE%"=="1" (
    powershell -ExecutionPolicy Bypass -File "%~dp0setup_kiosk.ps1" enable-web
) else if "%KIOSK_CHOICE%"=="2" (
    powershell -ExecutionPolicy Bypass -File "%~dp0setup_kiosk.ps1" enable-electron
) else (
    echo [INFO] Skipping kiosk setup.
)

echo.
echo ===================================================
echo   [3/4] NETWORK VERIFICATION
echo ===================================================
echo.

:: Check if ports are available
netstat -ano | findstr ":8090" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 8090 is currently in use.
) else (
    echo [OK] Port 8090 is available.
)

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4.*192\. IPv4.*10\. IPv4.*172\."') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP: =!
    echo [INFO] Local Network IP: !LOCAL_IP!
    goto :ip_found
)
echo [WARNING] Could not detect private network IP.
:ip_found

echo.
echo ===================================================
echo   [4/4] DATA DIRECTORIES
echo ===================================================
echo.

:: Create required data directories
if not exist "data" mkdir data
echo [OK] data/

if not exist "data\uploads" mkdir data\uploads
echo [OK] data/uploads/

if not exist "data\archive" mkdir data\archive
echo [OK] data/archive/

if not exist "data\logs" mkdir data\logs
echo [OK] data/logs/

if not exist "data\backups" mkdir data\backups
echo [OK] data/backups/

echo.
echo ===================================================
echo   MASTER STATION PC SETUP COMPLETE!
echo ===================================================
echo.
echo Next steps:
echo   1. Run 1_INSTALL.bat to install dependencies
echo   2. Run 2_BUILD.bat to build the application
echo   3. Run 3_START_DEV.bat (dev) or 4_START_PROD.bat (prod)
echo.
echo Port Map:
echo   Master Backend:  8090
echo   Touch Backend:   8091
echo   mDNS Discovery:  5353
echo.
pause
