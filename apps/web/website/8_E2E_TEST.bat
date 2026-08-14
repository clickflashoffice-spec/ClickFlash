@echo off
cd /d "%~dp0"
echo ===================================================
echo   MAIN WEBSITE - Run E2E Tests
echo ===================================================
pnpm run test:e2e
pause
