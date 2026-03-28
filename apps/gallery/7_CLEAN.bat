@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CUSTOMER GALLERY - Clean Build Artifacts
echo ===================================================
echo.

echo [INFO] Cleaning build artifacts...

if exist "dist" (
    echo   - Removing dist/...
    rmdir /s /q "dist" 2>nul
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
