@echo off
cd /d "%~dp0"
echo ===================================================
echo   CLOUD BACKEND - Build
echo ===================================================
pnpm run build
pause
