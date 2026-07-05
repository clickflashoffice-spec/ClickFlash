@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
1-CLICK INSTALLATION SYSTEM
echo ===================================================
echo.

REM 1. Infrastructure Checks
echo [1/5] Checking Infrastructure...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found.
    pause
    exit /b 1
)
echo [OK] Node.js detected.

REM 2. Install Dependencies
echo [2/5] Installing Dependencies (This may take a few minutes)...
call install-all.bat
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Dependency installation had issues.
)

REM 3. Hardware Provisioning (Locking Machine ID)
echo [3/5] Provisioning Hardware...
cd apps/master
call npm run provision
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Hardware provisioning failed.
    pause
    exit /b 1
)
cd ../..

REM 4. Site Selection
echo [4/5] Site Configuration Selection
echo 1) TN001-MO (Marhaba Occidental)
echo 2) TN002-MC (Marhaba Concorde)
echo 3) TN003-CGP (Club Green Park)
echo.
set /p CHOICE="Select Site (1-3): "

if "%CHOICE%"=="1" set SITE_ID=TN001-MO
if "%CHOICE%"=="2" set SITE_ID=TN002-MC
if "%CHOICE%"=="3" set SITE_ID=TN003-CGP

if "%SITE_ID%"=="" (
    echo [ERROR] Invalid Selection.
    pause
    exit /b 1
)

echo [Info] Provisioning Site: %SITE_ID%
call provision-site.bat %SITE_ID%

REM 5. Verification
echo [5/5] Final Verification...
echo [Info] Checking Cloud Connectivity...
curl -I https://management-hub.clickflash-office.workers.dev/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Cloud Management Hub is reachable.
) else (
    echo [WARNING] Cloud Management Hub is currently unreachable.
)

echo.
echo ===================================================
echo   SETUP COMPLETE FOR STATION: %SITE_ID%
echo ===================================================
echo.
echo Next Steps:
echo 1. Run "start-all.bat" to launch the ecosystem.
echo 2. Verify settings in the Master Dashboard.
echo.
pause
