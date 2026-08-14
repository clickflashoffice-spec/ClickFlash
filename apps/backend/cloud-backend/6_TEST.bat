@echo off
cd /d "%~dp0"
echo ===================================================
echo   CLOUD BACKEND - Run Unit Tests
echo ===================================================
pnpm run test
pause
