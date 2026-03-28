@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CUSTOMER GALLERY - Run Tests
echo ===================================================
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [WARNING] node_modules not found. Running install first...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
)

echo [INFO] Running tests...
echo.
npm test

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Some tests failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   Tests Complete!
echo ===================================================
pause
