@echo off
cd /d "%~dp0"
echo ===================================================
echo   TOUCH KIOSK - Clean Artifacts
echo ===================================================
pnpm run clean
pause
