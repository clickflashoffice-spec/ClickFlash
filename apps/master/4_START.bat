@echo off
cd /d "%~dp0"
echo [Antigravity Master] Starting Production Server on Port 8090...
echo.

REM Check if frontend is built
if not exist "dist\master\index.html" (
    echo [WARNING] Frontend not built. Building now...
    echo.
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Frontend build failed!
        pause
        exit /b 1
    )
    echo.
)

REM Check if backend is built
if not exist "dist\backend\server.js" (
    echo [WARNING] Backend not built. Building now...
    echo.
    call npm run build:backend
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Backend build failed!
        pause
        exit /b 1
    )
    echo.
    echo [INFO] Build complete.
    echo.
)

echo [INFO] Starting production server...
echo.

npm start
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Master Server crashed or failed to start.
    echo Check the logs above.
)
pause
