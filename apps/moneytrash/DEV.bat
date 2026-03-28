@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo   MoneyTrash Uploader - Development Mode
echo ==========================================
echo.
echo Starting Tauri development server...
echo This will open the desktop app window.
echo.
echo Press Ctrl+C to stop
echo.
npm run tauri:dev
