@echo off
:: ClickFlash Master OS - Uninstall Script
:: Run as Administrator

echo ==========================================
echo ClickFlash Master OS Uninstall
echo ==========================================

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run as Administrator
    pause
    exit /b 1
)

:: Stop any running processes
taskkill /F /IM "ClickFlash Master OS.exe" 2>nul
taskkill /F /IM "KioskGuardian.exe" 2>nul

:: Uninstall via registry
set "INSTALL_DIR=C:\Program Files\ClickFlash Master OS"
set "UNINSTALLER=%INSTALL_DIR%\Uninstall ClickFlash Master OS.exe"

if exist "%UNINSTALLER%" (
    echo Running official uninstaller...
    "%UNINSTALLER%" /S
    timeout /t 5 /nobreak >nul
)

:: Manual cleanup if needed
if exist "%INSTALL_DIR%" (
    echo Cleaning up remaining files...
    rmdir /S /Q "%INSTALL_DIR%"
)

:: Clean app data
set "APP_DATA=%LOCALAPPDATA%\clickflash-master"
if exist "%APP_DATA%" (
    echo Cleaning app data...
    rmdir /S /Q "%APP_DATA%"
)

:: Remove registry entries
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\com.clickflash.master" /f 2>nul
reg delete "HKLM\SOFTWARE\ClickFlash" /f 2>nul

echo.
echo ==========================================
echo Uninstall Complete
echo ==========================================
echo.
echo Now install the new version:
echo %USERPROFILE%\Desktop\ClickFlash\apps\master\release\ClickFlash Master OS Setup 4.2.0.exe
pause
