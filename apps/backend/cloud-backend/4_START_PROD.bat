@echo off
cd /d "%~dp0"
echo ===================================================
echo   CLOUD BACKEND - Start Production Server
echo ===================================================
pnpm run start
pause
