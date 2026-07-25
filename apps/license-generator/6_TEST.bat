@echo off
cd /d "%~dp0"
echo ===================================================
echo   LICENSE GENERATOR - Run Unit Tests
echo ===================================================
pnpm run test
pause
