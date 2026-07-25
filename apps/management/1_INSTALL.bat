@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MANAGEMENT PORTAL - Install Dependencies
echo ===================================================
echo.

where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pnpm not found in PATH. Install via: npm install -g pnpm
    pause
    exit /b 1
)

echo [INFO] Installing dependencies...
echo.
pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installation failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   Installation Complete!
echo ===================================================
pause
