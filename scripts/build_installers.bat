@echo off
echo ===========================================
echo   CLICKFLASH PRODUCTION BUILD SCRIPT
echo ===========================================
echo.
echo Building Master Portal Installer...
echo.
cd apps\master
call npm run package:installer
if %errorlevel% neq 0 (
  echo Error: Master build failed
  exit /b %errorlevel%
)
cd ..\..

echo.
echo Building Touch Kiosk Installer...
echo.
cd apps\touch
call npm run build:electron
if %errorlevel% neq 0 (
  echo Error: Touch build failed
  exit /b %errorlevel%
)
cd ..\..

echo.
echo Gathering installers into /release folder...
echo.
if not exist release mkdir release
copy apps\master\release\*.exe release\
copy apps\touch\release\*.exe release\

echo ===========================================
echo   BUILD COMPLETE! Installers in /release
echo ===========================================
