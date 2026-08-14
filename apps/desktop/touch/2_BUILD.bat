@echo off
cd /d "%~dp0"
echo ===================================================
echo   TOUCH KIOSK - Build
echo ===================================================
pnpm run build
pause
