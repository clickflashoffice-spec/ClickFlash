@echo off
echo ===================================================
echo   MASTER APP PRODUCTION BUILD
echo ===================================================

set "ELECTRON_BUILDER_CACHE=d:\master os\New folder\electron-cache"
cd "master app"

echo [0/3] KILLING PROCESSES...
powershell -Command "Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force"
powershell -Command "Get-Process 'Star Master Server' -ErrorAction SilentlyContinue | Stop-Process -Force"
timeout /t 2 /nobreak >nul

echo [1/3] CLEANING...
powershell -Command "if (Test-Path 'dist') { Remove-Item -Recurse -Force 'dist' }"
powershell -Command "if (Test-Path 'release') { Remove-Item -Recurse -Force 'release' }"
powershell -Command "if (Test-Path 'release_v2') { Remove-Item -Recurse -Force 'release_v2' }"

if exist "dist" echo WARNING: dist folder still exists.
if exist "release_v2" echo WARNING: release_v2 folder still exists.

echo [2/3] INSTALLING DEPENDENCIES...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo [3/3] PACKAGING...
call npm run package
if %errorlevel% neq 0 exit /b %errorlevel%

echo ===================================================
echo   BUILD SUCCESSFUL
echo   Output: master app/release_v2
echo ===================================================
pause
