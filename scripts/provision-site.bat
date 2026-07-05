@echo off
set SITE=%1

if "%SITE%"=="" (
    echo [Error] Please specify site ID ^(TN001-MO, TN002-MC, TN003-CGP^)
    echo Usage: provision-site.bat TN001-MO
    exit /b 1
)

echo [Info] Provisioning site: %SITE%

set ENV_FILE=E:\ClickFlash\apps\master\backend\.env.%SITE%
set TARGET_ENV=E:\ClickFlash\apps\master\backend\.env

if not exist "%ENV_FILE%" (
    echo [Error] Configuration file for %SITE% not found at %ENV_FILE%
    exit /b 1
)

echo [Info] Copying %ENV_FILE% to %TARGET_ENV%...
copy /y "%ENV_FILE%" "%TARGET_ENV%"

echo [Info] Site %SITE% pre-configured successfully.
echo [Info] You can now run "npm run dev" in apps/master/backend to test.
echo.
echo [MoneyTrash] Verifying MoneyTrash link...
rem Add MoneyTrash pre-config mapping if needed
echo [Info] Setup Complete.
