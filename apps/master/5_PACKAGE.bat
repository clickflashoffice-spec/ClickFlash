@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MASTER PORTAL - Build Electron Package
echo ===================================================
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [WARNING] node_modules not found. Running install first...
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
)

REM Kill any running Electron processes
echo [INFO] Stopping any running Electron processes...
taskkill /F /IM electron.exe /T 2>nul
timeout /t 2 /nobreak >nul

REM Clean previous builds
echo [INFO] Cleaning previous builds...
if exist "dist" rmdir /s /q "dist" 2>nul
if exist "release" rmdir /s /q "release" 2>nul
if exist "release_v2" rmdir /s /q "release_v2" 2>nul

echo.
echo [INFO] Building Electron package...
echo [INFO] This may take several minutes...
echo.

npm run package

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Package build failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   Package Build Complete!
echo   Output: release/ or release_v2/
echo ===================================================
pause
