@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   TOUCH APP: 4. START PRODUCTION
echo ==========================================
echo.
title Touch App - Production Server
call npm start
pause
