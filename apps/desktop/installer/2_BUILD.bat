@echo off
cd /d "%~dp0"
echo ===================================================
echo   STUDIO INSTALLER - Build
pnpm run build:all
pause
