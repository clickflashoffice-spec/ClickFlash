@echo off
cd /d "%~dp0"
echo ===================================================
echo   CUSTOMER GALLERY - Run Unit Tests
echo ===================================================
pnpm run test
pause
