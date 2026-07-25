@echo off
cd /d "%~dp0"
echo ===================================================
echo   MASTER PORTAL - Clean Artifacts
echo ===================================================
pnpm run clean
pause
