@echo off
cd /d "%~dp0"
echo ===================================================
echo   MAIN WEBSITE - Run Unit Tests
echo ===================================================
pnpm run test
pause
