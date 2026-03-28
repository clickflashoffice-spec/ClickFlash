@echo off
setlocal enabledelayedexpansion

:: ===================================================
::   CLICKFLASH TOUCH KIOSK - PC SETUP
::   Configures Firewall, Kiosk Mode, and Network
:: ===================================================

cd /d "%~dp0"

echo ===================================================
echo   CLICKFLASH - Touch Kiosk PC Setup
echo ===================================================
echo.
echo This script will:
echo   1. Configure Windows Firewall (ports 8090, 8091, 5353)
echo   2. Set up Kiosk mode (Chrome kiosk for Touch screen)
echo   3. Verify network connectivity to Master Station
echo   4. Create local data directories
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
echo   1. Web Kiosk (Chrome) - Runs Touch UI in locked Chrome
echo   2. Electron Kiosk - Production Electron shell
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
echo   [3/4] MASTER STATION CONNECTIVITY
echo ===================================================
echo.
echo Testing connection to Master Station...
echo.

set /p MASTER_IP="Enter Master Station IP (default: 192.168.1.100): "
if "%MASTER_IP%"=="" set MASTER_IP=192.168.1.100

echo Pinging %MASTER_IP%...
ping -n 1 -w 2000 %MASTER_IP% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Master Station reachable at %MASTER_IP%
    
    REM Try to hit the health endpoint
    curl -s -o nul -w "%%{http_code}" http://%MASTER_IP%:8090/api/health >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Master API responding on port 8090
    ) else (
        echo [INFO] Master API not responding yet. Start Master first.
    )
) else (
    echo [WARNING] Cannot reach %MASTER_IP%. Check:
    echo   - Master PC is powered on and on the same network
    echo   - Ethernet cable is connected (direct or via switch)
    echo   - Master firewall allows port 8090
)

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

if not exist "data\orders" mkdir data\orders
echo [OK] data/orders/

if not exist "data\logs" mkdir data\logs
echo [OK] data/logs/

echo.
echo ===================================================
echo   TOUCH KIOSK PC SETUP COMPLETE!
echo ===================================================
echo.
echo Next steps:
echo   1. Run 1_INSTALL.bat to install dependencies
echo   2. Run 2_BUILD.bat to build the application
echo   3. Run 4_START.bat to start in production mode
echo.
echo Touch Port: 8091
echo Master IP:  %MASTER_IP%:8090
echo.
pause
