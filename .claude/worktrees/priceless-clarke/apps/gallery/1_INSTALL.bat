@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CUSTOMER GALLERY - Install Dependencies
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

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found in PATH
    pause
    exit /b 1
)

echo [INFO] Installing dependencies...
echo.
npm install
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
