@echo off
title Touch App Watchdog
cd /d "%~dp0"
echo Starting Watchdog...
node watchdog.js
pause
