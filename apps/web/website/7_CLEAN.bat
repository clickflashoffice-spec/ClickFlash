@echo off
cd /d "%~dp0"
echo ===================================================
echo   MAIN WEBSITE - Clean Artifacts
echo ===================================================
pnpm run clean
pause
