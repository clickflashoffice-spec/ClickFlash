@echo off
cd /d "%~dp0"
echo ===================================================
echo   MANAGEMENT PORTAL - Package / Deploy
echo ===================================================
pnpm run package
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] 'package' script might not exist. Attempting 'deploy' instead...
    pnpm run deploy
)
pause
