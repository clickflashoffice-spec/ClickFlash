@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CLICKFLASH ECOSYSTEM - Install All Dependencies
echo ===================================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%
echo.

REM ================================================
REM Root dependencies (shared across workspace)
REM ================================================
echo [0/4] Installing root dependencies...
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Root installation failed!
    pause
    exit /b 1
)
echo.

REM ================================================
REM Master Station (Local - Electron + Express)
REM ================================================
echo [1/4] Installing Master Station...
if exist "apps\master" (
    cd apps\master
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 echo [WARNING] Master Station installation had issues
    cd ..\..
) else (
    echo [WARNING] Master Station not found
)
echo.

REM ================================================
REM Touch Kiosk (Local - Electron + Express)
REM ================================================
echo [2/4] Installing Touch Kiosk...
if exist "apps\touch" (
    cd apps\touch
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 echo [WARNING] Touch Kiosk installation had issues
    cd ..\..
) else (
    echo [WARNING] Touch Kiosk not found
)
echo.

REM ================================================
REM Money Trash (Local - Next.js Lead Capture)
REM ================================================
echo [3/4] Installing Money Trash Uploader...
if exist "apps\moneytrash" (
    cd apps\moneytrash
    call npm install
    if %ERRORLEVEL% NEQ 0 echo [WARNING] Money Trash installation had issues
    cd ..\..
) else (
    echo [WARNING] Money Trash not found
)
echo.

REM ================================================
REM Backup Service (Local Package)
REM ================================================
echo [4/4] Installing Backup Service...
if exist "packages\backup-service" (
    cd packages\backup-service
    call npm install
    if %ERRORLEVEL% NEQ 0 echo [WARNING] Backup Service installation had issues
    cd ..\..
) else (
    echo [WARNING] Backup Service not found
)
echo.

echo ===================================================
echo   Installation Complete!
echo ===================================================
echo.
echo Local apps installed. Cloud apps (Management, Gallery,
echo Website) are deployed via deploy_ecosystem.ps1.
echo.
echo Run start-all.bat to launch local applications.
echo.
pause
