@echo off
cd /d "%~dp0"
echo ===================================================
echo   STUDIO INSTALLER - Build
echo ===================================================
pnpm run build
pause
