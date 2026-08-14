@echo off
cd /d "%~dp0"
echo ===================================================
echo   CLOUD BACKEND - Clean Artifacts
echo ===================================================
pnpm run clean
pause
