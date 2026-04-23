@echo off
chcp 65001 >nul
echo ==========================================
echo  Phase 71: Quick Test Script
echo ==========================================
echo.

cd ..\electron-new

echo [1/2] Building TypeScript (if needed)...
if not exist "dist\main\index.js" (
    call npm run build
    if errorlevel 1 (
        echo     ✗ Build failed
        pause
        exit /b 1
    )
) else (
    echo     ✓ Already built
)

cd ..

echo.
echo [2/2] Starting Electron with new architecture...
echo     NOTE: Make sure backend is running on port 8090!
echo.
echo Starting in 3 seconds... (Ctrl+C to cancel)
timeout /t 3 /nobreak >nul

echo.
npx electron electron-main-new.js
echo.
echo Electron exited.
pause
