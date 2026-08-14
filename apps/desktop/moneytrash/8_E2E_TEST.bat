@echo off
cd /d "%~dp0"
echo ===================================================
echo   MONEY TRASH UPLOADER - Run E2E Tests
echo ===================================================
pnpm run test:e2e
pause
