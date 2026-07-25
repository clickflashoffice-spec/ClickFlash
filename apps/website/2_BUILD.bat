@echo off
cd /d "%~dp0"
echo ===================================================
echo   MAIN WEBSITE - Build
echo ===================================================
pnpm run build
pause
