@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   CLICKFLASH ECOSYSTEM - Kill All Local Processes
echo ===================================================
echo.
echo This will terminate:
echo   - All Node.js processes
echo   - All Electron processes
echo   - Local service ports (8090, 8091, 3000, 5173, 5174)
echo.
echo Press Ctrl+C to cancel, or
echo.
pause

echo.
echo [INFO] Stopping all local processes...
echo.

REM Kill Node.js processes
echo   Stopping Node.js processes...
taskkill /F /IM node.exe /T 2>nul

REM Kill Electron processes
echo   Stopping Electron processes...
taskkill /F /IM electron.exe /T 2>nul

REM Kill remaining processes on local service ports only
echo   Cleaning up port bindings...
for %%p in (8090 8091 3000 5173 5174) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " 2^>nul') do (
        taskkill /F /PID %%a 2>nul
    )
)

echo.
echo ===================================================
echo   All local ClickFlash processes terminated.
echo ===================================================
echo.
pause
