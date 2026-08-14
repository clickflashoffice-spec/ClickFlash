@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo   MoneyTrash Uploader - Build for Production
echo ==========================================
echo.
echo This will build the desktop app for production.
echo Output will be in: src-tauri/target/release/bundle/
echo.
echo Press any key to start building...
pause >nul
echo.
npm run tauri:build
echo.
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo.
echo ✅ Build complete!
echo.
echo Output location:
echo   src-tauri/target/release/bundle/
echo.
pause
