@echo off
cd /d "%~dp0"
echo ===================================================
echo   MANAGEMENT PORTAL - Build
echo ===================================================
pnpm run build
pause
