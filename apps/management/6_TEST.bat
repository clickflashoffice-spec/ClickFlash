@echo off
cd /d "%~dp0"
echo ===================================================
echo   MANAGEMENT PORTAL - Run Unit Tests
echo ===================================================
pnpm run test
pause
