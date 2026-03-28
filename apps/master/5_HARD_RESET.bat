@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CLICKFLASH MASTER - HARD RESET
echo ===================================================
echo.
echo [WARNING] This will:
echo   - Kill all running Node/Electron processes
echo   - Delete node_modules, dist, backend-dist
echo   - Delete data/master.db (DATABASE WIPE)
echo   - Reinstall all dependencies
echo   - Rebuild frontend and backend
echo.
echo YOUR PHOTO FILES WILL NOT BE DELETED.
echo.
echo Press Ctrl+C to cancel, or
echo.
pause

echo.
echo [1/5] Killing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
echo Done.

echo.
echo [2/5] Cleaning artifacts...
if exist node_modules (
    echo   Removing node_modules...
    rd /s /q node_modules
)
if exist dist (
    echo   Removing dist/
    rd /s /q dist
)
if exist backend-dist (
    echo   Removing backend-dist/
    rd /s /q backend-dist
)

REM Database wipe (optional - uncomment to enable)
REM if exist "data\master.db" (
REM     echo   Removing master.db...
REM     del /q "data\master.db"
REM )

echo Done.

echo.
echo [3/5] Fresh install...
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installation failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Building frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Building backend...
call npm run build:backend
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   HARD RESET COMPLETE
echo ===================================================
echo.
echo Next: Run 3_START_DEV.bat or 4_START_PROD.bat
echo.
pause
