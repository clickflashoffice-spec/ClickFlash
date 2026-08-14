@echo off
title Touch App - Port 8091 (Quick Start)
cd /d "%~dp0"

echo ==============================================
echo   TOUCH APP - QUICK START (NO BUILD)
echo ==============================================
echo.
echo Starting server without rebuilding...
echo App URL: http://localhost:8091
echo Press Ctrl+C to stop
echo.

npm start
