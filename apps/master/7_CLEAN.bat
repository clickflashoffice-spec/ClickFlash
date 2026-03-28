@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MASTER PORTAL - Clean Build Artifacts
echo ===================================================
echo.

echo [INFO] Cleaning build artifacts...

if exist "dist" (
    echo   - Removing dist/...
    rmdir /s /q "dist" 2>nul
)

if exist "release" (
    echo   - Removing release/...
    rmdir /s /q "release" 2>nul
)

if exist "release_v2" (
    echo   - Removing release_v2/...
    rmdir /s /q "release_v2" 2>nul
)

if exist "node_modules\.cache" (
    echo   - Cleaning Vite cache...
    rmdir /s /q "node_modules\.cache" 2>nul
)

echo.
echo ===================================================
echo   Clean Complete!
echo ===================================================
pause
