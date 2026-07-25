@echo off
cd /d "%~dp0"
echo ===================================================
echo   LICENSE GENERATOR - Run E2E Tests
echo ===================================================
pnpm run test:e2e
pause
