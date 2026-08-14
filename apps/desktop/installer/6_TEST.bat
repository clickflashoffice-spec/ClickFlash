@echo off
cd /d "%~dp0"
echo ===================================================
echo   STUDIO INSTALLER - Run Unit Tests
echo ===================================================
pnpm run test
pause
