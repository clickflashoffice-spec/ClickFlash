@echo off
setlocal enabledelayedexpansion
REM ClickFlash Master Station - One-Command Setup (Windows)
REM Usage: setup-master.bat [DESK_ID] [DESK_NAME] [LOCATION]

echo.
echo ============================================
echo    CLICKFLASH MASTER - SETUP WIZARD
echo ============================================
echo.

REM Check for --profile flag
if "%~1"=="--profile" (
    set "PROFILE=%~2"
    shift
    shift
)

if "%~1"=="" if "!PROFILE!"=="" (
    echo Usage: setup-master.bat ^<DESK_ID^> [DESK_NAME] [LOCATION]
    echo    OR: setup-master.bat --profile ^<profile_name^>
    echo.
    echo Examples:
    echo   setup-master.bat MASTER_MALDIVES_01
    echo   setup-master.bat --profile marhaba-club
    exit /b 1
)

if not "!PROFILE!"=="" (
    set "PROFILE_FILE=%~dp0profiles\!PROFILE!.env"
    if exist "!PROFILE_FILE!" (
        echo [INFO] Loading profile: !PROFILE!
        for /f "usebackq tokens=1* delims==" %%a in ("!PROFILE_FILE!") do (
            set "VAR_NAME=%%a"
            if not "!VAR_NAME:~0,1!"=="#" if not "!VAR_NAME!"=="" (
                set "%%a=%%b"
            )
        )
    ) else (
        echo [ERROR] Profile not found: !PROFILE_FILE!
        exit /b 1
    )
) else (
    set "DESK_ID=%~1"
    set "DESK_NAME=%~2"
    if "%~2"=="" set "DESK_NAME=Master Station !DESK_ID!"
    set "LOCATION=%~3"
    if "%~3"=="" set "LOCATION=Unknown Location"
)

echo Setting up Master Station: !DESK_ID!
echo Name: !DESK_NAME!
echo Location: !LOCATION!
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%.."
set "PROJECT_DIR=%BACKEND_DIR%\.."

REM Step 1: Check prerequisites
echo [INFO] Checking prerequisites...

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js v18 or higher.
    exit /b 1
)
echo [SUCCESS] Node.js found

REM Step 2: Create directories
echo [INFO] Creating directories...
mkdir "%PROJECT_DIR%\pb_data\uploads" 2>nul
mkdir "%PROJECT_DIR%\pb_data\trash_archive" 2>nul
mkdir "%PROJECT_DIR%\logs" 2>nul
mkdir "%PROJECT_DIR%\backup" 2>nul
echo [SUCCESS] Directories created

REM Step 3: Install dependencies
echo [INFO] Installing dependencies...
cd /d "%BACKEND_DIR%"
if exist "package.json" (
    call npm install
    echo [SUCCESS] Dependencies installed
) else (
    echo [WARN] No package.json found
)

REM Step 4: Check for existing configuration
set "ENV_FILE=%PROJECT_DIR%\.env"
if exist "%ENV_FILE%" (
    if "!PROFILE!"=="" (
        echo [WARN] Existing .env file found
        set /p RESET_CONFIG="Backup and create new configuration? (yes/no): "
        if /i "!RESET_CONFIG!"=="yes" (
            copy "%ENV_FILE%" "%ENV_FILE%.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
            echo [INFO] Backup created
        )
    ) else (
        echo [INFO] Profile provided, skipping env reset prompt.
    )
) else (
    if exist "%SCRIPT_DIR%\config-template.env" (
        copy "%SCRIPT_DIR%\config-template.env" "%ENV_FILE%"
        echo [SUCCESS] Created .env from template
    )
)

REM Step 5: Run setup wizard
echo.
echo ============================================
echo    INTERACTIVE SETUP WIZARD
echo ============================================
echo.

if exist "%SCRIPT_DIR%\cloud-setup-wizard.js" (
    set "AUTO_FLAGS="
    if not "!PROFILE!"=="" (
        set "AUTO_FLAGS=--auto --desk-id=!DESK_ID! --desk-name=\"!DESK_NAME!\" --location=\"!LOCATION!\" --hub-url=!CLOUD_API_URL! --gallery-url=!GALLERY_URL! --email=!CLOUD_EMAIL! --skip-test"
    )
    node "%SCRIPT_DIR%\cloud-setup-wizard.js" !AUTO_FLAGS!
) else (
    echo [WARN] Setup wizard not found
    echo.
    echo === Manual Configuration ===
    echo.
    set /p HUB_URL="Management Hub URL (e.g., https://management.clickflash.app): "
    set /p ADMIN_EMAIL="Admin Email: "
    set /p ADMIN_PASS="Admin Password: "
    set /p GALLERY_URL="Gallery URL (e.g., https://gallery.clickflash.app): "
    
    (
        echo.
        echo # Auto-generated configuration
        echo DESK_ID=%DESK_ID%
        echo DESK_NAME=%DESK_NAME%
        echo DESK_LOCATION=%LOCATION%
        echo CLOUD_API_URL=%HUB_URL%
        echo CLOUD_EMAIL=%ADMIN_EMAIL%
        echo CLOUD_PASSWORD=%ADMIN_PASS%
        echo GALLERY_URL=%GALLERY_URL%
        echo GALLERY_ENABLED=true
        echo CLOUD_SYNC_ENABLED=true
        echo MONEYTRASH_ENABLED=true
        echo RETENTION_DAYS=15
    ) >> "%ENV_FILE%"
    
    echo [SUCCESS] Configuration saved
)

REM Step 6: Run migrations (if sqlite3 available)
echo [INFO] Running database migrations...
sqlite3 --version >nul 2>&1
if not errorlevel 1 (
    set "DB_FILE=%PROJECT_DIR%\pb_data\data.db"
    mkdir "%PROJECT_DIR%\pb_data" 2>nul
    
    for %%f in ("%BACKEND_DIR%\shared\migrations\*.sql") do (
        echo [INFO] Applying migration: %%~nxf
        sqlite3 "%DB_FILE%" < "%%f" 2>nul || echo [WARN] Migration may already be applied
    )
    
    for %%f in ("%BACKEND_DIR%\migrations\*.sql") do (
        echo [INFO] Applying migration: %%~nxf
        sqlite3 "%DB_FILE%" < "%%f" 2>nul || echo [WARN] Migration may already be applied
    )
    
    echo [SUCCESS] Migrations completed
) else (
    echo [WARN] SQLite3 not found. Migrations will run on first start.
)

REM Step 7: Create startup script
echo [INFO] Creating startup script...
(
    echo @echo off
    echo REM Start ClickFlash Master Station
    echo.
    echo cd /d "%~dp0\backend"
    echo.
    echo echo Starting ClickFlash Master: %DESK_ID%
    echo call npm start
) > "%PROJECT_DIR%\start-master.bat"
echo [SUCCESS] Startup script created

REM Step 8: Final checks
echo [INFO] Running final checks...
if exist "%ENV_FILE%" (
    findstr /C:"DESK_ID=" "%ENV_FILE%" >nul && findstr /C:"CLOUD_API_URL=" "%ENV_FILE%" >nul
    if not errorlevel 1 (
        echo [SUCCESS] Configuration validated
    ) else (
        echo [WARN] Configuration may be incomplete
    )
)

REM Create marker file
echo %DESK_ID% > "%PROJECT_DIR%\.setup-complete"

echo.
echo ============================================
echo    SETUP COMPLETED SUCCESSFULLY!
echo ============================================
echo.
echo Master Station: %DESK_ID%
echo Name: %DESK_NAME%
echo Location: %LOCATION%
echo.
echo Next Steps:
echo   1. Review configuration: type .env
echo   2. Start application: start-master.bat
echo   3. Or use: npm start
echo   4. Access: http://localhost:8090
echo.
echo For help, see: MASTER_SETUP_GUIDE.md
echo.
echo Setup finished.
exit /b 0
