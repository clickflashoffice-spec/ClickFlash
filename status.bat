@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   CLICKFLASH ECOSYSTEM - Service Status
echo ===================================================
echo.
echo Checking local application ports...
echo.

REM Local service ports
set "PORTS=8090 8091 3000 5173 5174"
set "PORT_NAMES[8090]=Master Station Backend"
set "PORT_NAMES[8091]=Touch Kiosk Backend"
set "PORT_NAMES[3000]=Money Trash Uploader"
set "PORT_NAMES[5173]=Master Station Frontend (Vite)"
set "PORT_NAMES[5174]=Touch Kiosk Frontend (Vite)"

REM Check each port
for %%p in (%PORTS%) do (
    netstat -ano | findstr ":%%p " >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [RUNNING] Port %%p - !PORT_NAMES[%%p]!
    ) else (
        echo [STOPPED] Port %%p - !PORT_NAMES[%%p]!
    )
)

echo.
echo ---------------------------------------------------
echo   Cloud Apps (deployed via deploy_ecosystem.ps1)
echo ---------------------------------------------------
echo   Management Hub:   Cloudflare Worker
echo   Customer Gallery: Cloudflare Worker + R2
echo   Main Website:     Cloudflare Pages
echo.

echo ===================================================
echo   Process Summary
echo ===================================================
echo.

echo Node.js processes:
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /C "node.exe" >nul
if %ERRORLEVEL% EQU 0 (
    tasklist /FI "IMAGENAME eq node.exe" 2>nul | findstr /V "INFO"
) else (
    echo   (none running)
)

echo.
echo Electron processes:
tasklist /FI "IMAGENAME eq electron.exe" 2>nul | find /C "electron.exe" >nul
if %ERRORLEVEL% EQU 0 (
    tasklist /FI "IMAGENAME eq electron.exe" 2>nul | findstr /V "INFO"
) else (
    echo   (none running)
)

echo.
echo ===================================================
pause
