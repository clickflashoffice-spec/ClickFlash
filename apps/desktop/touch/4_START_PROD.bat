@echo off
cd /d "%~dp0"
echo ===================================================
echo   TOUCH KIOSK - Start Production Server
echo ===================================================
pnpm run start
pause
