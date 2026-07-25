@echo off
cd /d "%~dp0"
echo ===================================================
echo   MONEY TRASH UPLOADER - Run Unit Tests
echo ===================================================
pnpm run test
pause
