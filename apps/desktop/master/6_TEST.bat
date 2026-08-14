@echo off
cd /d "%~dp0"
echo ===================================================
echo   MASTER PORTAL - Run Unit Tests
echo ===================================================
pnpm run test
pause
