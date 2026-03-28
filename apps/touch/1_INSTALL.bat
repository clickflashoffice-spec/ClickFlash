@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   TOUCH APP: 1. INSTALLATION
echo ==========================================
echo.
echo Installing dependencies for Touch App...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Installation failed.
    pause
    exit /b %errorlevel%
)
echo.
echo [SUCCESS] Dependencies installed.
pause
