@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MAIN WEBSITE - Clean Build Artifacts
echo ===================================================
echo.

echo [INFO] Cleaning build artifacts...

if exist ".next" (
    echo   - Removing .next/...
    rmdir /s /q ".next" 2>nul
)

if exist "node_modules\.cache" (
    echo   - Cleaning Next.js cache...
    rmdir /s /q "node_modules\.cache" 2>nul
)

echo.
echo ===================================================
echo   Clean Complete!
echo ===================================================
pause
