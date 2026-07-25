@echo off
cd /d "%~dp0"
echo ===================================================
echo   TOUCH KIOSK - Run Unit Tests
echo ===================================================
pnpm run test
pause
