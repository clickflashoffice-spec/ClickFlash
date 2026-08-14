@echo off
cd /d "%~dp0"
echo ===================================================
echo   CUSTOMER GALLERY - Clean Artifacts
echo ===================================================
pnpm run clean
pause
