@echo off
cd /d "%~dp0"
echo ===================================================
echo   CUSTOMER GALLERY - Build
echo ===================================================
pnpm run build
pause
