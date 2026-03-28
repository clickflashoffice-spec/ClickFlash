@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   CLICKFLASH MULTI-HOTEL PRODUCTION BUILDER
echo ===================================================

:: Configuration
set "APP_DIR=%~dp0"
set "CONFIG_DIR=%APP_DIR%configs"
set "DEPLOY_DIR=%APP_DIR%deploy"
set "RELEASE_DIR=%APP_DIR%release_v3"

:: Ensure deploy directory exists
if not exist "%DEPLOY_DIR%" mkdir "%DEPLOY_DIR%"

:: Hotel List (ID:Code)
set "HOTELS=occidental:TN001_MO club:TN002_MC concorde:TN003_CGP"

echo [1/4] Cleaning workspace...
call npm run clean

for %%H in (%HOTELS%) do (
    for /f "tokens=1,2 delims=:" %%A in ("%%H") do (
        set "HOTEL_ID=%%A"
        set "HOTEL_CODE=%%B"
        
        echo.
        echo ---------------------------------------------------
        echo   BUILDING FOR: !HOTEL_ID! (!HOTEL_CODE!)
        echo ---------------------------------------------------
        
        :: 1. Swap Environment File
        echo [2/4] Swapping config to !HOTEL_ID!.env...
        if not exist "%CONFIG_DIR%\!HOTEL_ID!.env" (
            echo ERROR: Config file !HOTEL_ID!.env not found index in configs/
            goto :error
        )
        copy /y "%CONFIG_DIR%\!HOTEL_ID!.env" "%APP_DIR%.env.production" > nul
        
        :: 2. Run Build & Package
        echo [3/4] Packaging v3 for !HOTEL_CODE!...
        call npm run package:v3
        if !errorlevel! neq 0 (
            echo ERROR: Build failed for !HOTEL_ID!
            goto :error
        )
        
        :: 3. Export Artifact
        echo [4/4] Exporting to deploy/ClickFlash_Master_!HOTEL_CODE!.exe...
        :: Find the generated exe in release_v3
        for /f "delims=" %%F in ('dir /b "%RELEASE_DIR%\*.exe"') do (
            move /y "%RELEASE_DIR%\%%F" "%DEPLOY_DIR%\ClickFlash_Master_!HOTEL_CODE!.exe" > nul
            echo SUCCESS: !HOTEL_CODE! installer ready.
        )
        
        :: Clean release folder for next iteration
        powershell -Command "if (Test-Path '%RELEASE_DIR%') { Remove-Item -Recurse -Force '%RELEASE_DIR%' }"
    )
)

echo.
echo ===================================================
echo   ALL PRODUCTION PACKAGES GENERATED SUCCESSFULLY
echo   Location: %DEPLOY_DIR%
echo ===================================================
pause
exit /b 0

:error
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo   BUILD FAILED - CHECK LOGS
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
pause
exit /b 1
