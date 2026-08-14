@echo off
cd /d "%~dp0"
echo ===================================================
echo   TOUCH KIOSK - Start Development Server
echo ===================================================
pnpm run dev
pause
