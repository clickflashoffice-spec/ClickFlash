@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo  Phase 71: Electron Build Script
echo  ClickFlash Master OS - New Architecture
echo ==========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please run this script from apps/master directory
    exit /b 1
)

REM Step 1: Clean previous builds
echo [1/5] Cleaning previous builds...
call npm run clean 2>nul
if exist "electron-new\dist" rmdir /s /q "electron-new\dist"
echo     ✓ Clean complete
echo.

REM Step 2: Build frontend
echo [2/5] Building frontend (Vite)...
call npm run build
if errorlevel 1 (
    echo     ✗ Frontend build failed
    exit /b 1
)
echo     ✓ Frontend build complete
echo.

REM Step 3: Build backend
echo [3/5] Building backend (ESBuild)...
call npm run build:backend
if errorlevel 1 (
    echo     ✗ Backend build failed
    exit /b 1
)
echo     ✓ Backend build complete
echo.

REM Step 4: Build new Electron main process
echo [4/5] Building new Electron main process (TypeScript)...
cd electron-new
if not exist "node_modules" (
    echo     Installing dependencies...
    call npm install
)
call npm run build
if errorlevel 1 (
    echo     ✗ Electron build failed
    cd ..
    exit /b 1
)
cd ..
echo     ✓ Electron build complete
echo.

REM Step 5: Package with electron-builder
echo [5/5] Packaging with electron-builder...
call npx electron-builder build --win --config electron-builder-v3.yml
if errorlevel 1 (
    echo     ✗ Packaging failed
    exit /b 1
)
echo     ✓ Packaging complete
echo.

echo ==========================================
echo  Build Complete! 🎉
echo ==========================================
echo.
echo Output location: release_v3\win-unpacked\
echo Installer: release_v3\ClickFlash Master OS Setup.exe
echo.
echo To test the build:
echo   release_v3\win-unpacked\ClickFlash Master OS.exe
echo.

pause
