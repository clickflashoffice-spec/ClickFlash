@echo off
cd /d "%~dp0"
echo ===================================================
echo   MANAGEMENT PORTAL - Run E2E Tests
echo ===================================================
pnpm run test:e2e
pause
