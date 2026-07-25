@echo off
cd /d "%~dp0"
echo ===================================================
echo   MANAGEMENT PORTAL - Clean Artifacts
echo ===================================================
pnpm run clean
pause
