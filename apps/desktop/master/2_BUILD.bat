@echo off
cd /d "%~dp0"
echo ===================================================
echo   MASTER PORTAL - Build
echo ===================================================
pnpm run build
pause
