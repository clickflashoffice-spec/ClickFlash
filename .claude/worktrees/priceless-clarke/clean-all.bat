@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CLICKFLASH ECOSYSTEM - Clean All Build Artifacts
echo ===================================================
echo.
echo This will remove build artifacts from local apps.
echo.
echo Press Ctrl+C to cancel, or
echo.
pause

echo.
echo [INFO] Cleaning build artifacts...
echo.

REM ================================================
REM Master Station
REM ================================================
echo [1/4] Cleaning Master Station...
if exist "apps\master\dist" (
    rmdir /s /q "apps\master\dist" 2>nul
    echo   - Removed dist/
)
if exist "apps\master\backend-dist" (
    rmdir /s /q "apps\master\backend-dist" 2>nul
    echo   - Removed backend-dist/
)
if exist "apps\master\release" (
    rmdir /s /q "apps\master\release" 2>nul
    echo   - Removed release/
)

REM ================================================
REM Touch Kiosk
REM ================================================
echo [2/4] Cleaning Touch Kiosk...
if exist "apps\touch\dist" (
    rmdir /s /q "apps\touch\dist" 2>nul
    echo   - Removed dist/
)
if exist "apps\touch\backend-dist" (
    rmdir /s /q "apps\touch\backend-dist" 2>nul
    echo   - Removed backend-dist/
)
if exist "apps\touch\release" (
    rmdir /s /q "apps\touch\release" 2>nul
    echo   - Removed release/
)

REM ================================================
REM Money Trash
REM ================================================
echo [3/4] Cleaning Money Trash Uploader...
if exist "apps\moneytrash\.next" (
    rmdir /s /q "apps\moneytrash\.next" 2>nul
    echo   - Removed .next/
)

REM ================================================
REM Backup Service
REM ================================================
echo [4/4] Cleaning Backup Service...
if exist "packages\backup-service\dist" (
    rmdir /s /q "packages\backup-service\dist" 2>nul
    echo   - Removed dist/
)

echo.
echo ===================================================
echo   Clean Complete!
echo ===================================================
echo.
pause
