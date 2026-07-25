@echo off
cd /d "%~dp0"
echo ===================================================
echo   CUSTOMER GALLERY - Run E2E Tests
echo ===================================================
pnpm run test:e2e
pause
