@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   TOUCH APP: 2. PRODUCTION BUILD
echo   (Clean -> Audit -> Compile -> Minify)
echo ==========================================
echo.

echo [1/4] Cleaning build artifacts...
if exist dist rd /s /q dist
if exist backend-dist rd /s /q backend-dist
echo DONE.

echo.
echo [2/4] Auditing code (Linting)...
call npm run lint
if %errorlevel% neq 0 (
    echo [WARNING] Linting found issues, but continuing build...
) else (
    echo DONE.
)

echo.
echo [3/4] Compiling Frontend (Minifying)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b %errorlevel%
)
echo DONE.

echo.
echo [4/4] Compiling Backend...
call npm run build:backend
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed.
    pause
    exit /b %errorlevel%
)
echo DONE.

echo.
echo ==========================================
echo [SUCCESS] Touch App built for production.
echo ==========================================
pause
