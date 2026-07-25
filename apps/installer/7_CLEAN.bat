@echo off
cd /d "%~dp0"
echo ===================================================
echo   STUDIO INSTALLER - Clean Artifacts
echo ===================================================
pnpm run clean
pause
