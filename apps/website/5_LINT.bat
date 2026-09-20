@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   MAIN WEBSITE - Run Linter
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

echo [INFO] Running ESLint...
echo.
npm run lint

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Linting found issues!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   Linting Complete!
echo ===================================================
pause
