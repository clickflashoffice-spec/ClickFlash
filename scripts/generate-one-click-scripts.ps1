$ErrorActionPreference = "Stop"

$apps = @{
    "master" = "MASTER PORTAL"
    "touch" = "TOUCH KIOSK"
    "moneytrash" = "MONEY TRASH UPLOADER"
    "website" = "MAIN WEBSITE"
    "management" = "MANAGEMENT PORTAL"
    "gallery" = "CUSTOMER GALLERY"
    "installer" = "STUDIO INSTALLER"
    "license-generator" = "LICENSE GENERATOR"
    "cloud-backend" = "CLOUD BACKEND"
}

$workspaceRoot = (Get-Item ".\").FullName

foreach ($app in $apps.GetEnumerator()) {
    $appNameKey = $app.Name
    $appDisplayName = $app.Value
    $appDir = Join-Path -Path "apps" -ChildPath $appNameKey

    if (-not (Test-Path -Path $appDir)) {
        Write-Host "Directory $appDir does not exist, skipping."
        continue
    }

    Write-Host "Processing $appDisplayName ($appDir)..."

    # Define standard script contents
    $installContent = @"
@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   $appDisplayName - Install Dependencies
echo ===================================================
echo.

where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pnpm not found in PATH. Install via: npm install -g pnpm
    pause
    exit /b 1
)

echo [INFO] Installing dependencies...
echo.
pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installation failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   Installation Complete!
echo ===================================================
pause
"@

    $buildContent = @"
@echo off
cd /d "%~dp0"
echo ===================================================
echo   $appDisplayName - Build
echo ===================================================
pnpm run build
pause
"@

    $startDevContent = @"
@echo off
cd /d "%~dp0"
echo ===================================================
echo   $appDisplayName - Start Development Server
echo ===================================================
pnpm run dev
pause
"@

    $startProdContent = @"
@echo off
cd /d "%~dp0"
echo ===================================================
echo   $appDisplayName - Start Production Server
echo ===================================================
pnpm run start
pause
"@

    $packageContent = @"
@echo off
cd /d "%~dp0"
echo ===================================================
echo   $appDisplayName - Package / Deploy
echo ===================================================
pnpm run package
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] 'package' script might not exist. Attempting 'deploy' instead...
    pnpm run deploy
)
pause
"@

    $testContent = @"
@echo off
cd /d "%~dp0"
echo ===================================================
echo   $appDisplayName - Run Unit Tests
echo ===================================================
pnpm run test
pause
"@

    $cleanContent = @"
@echo off
cd /d "%~dp0"
echo ===================================================
echo   $appDisplayName - Clean Artifacts
echo ===================================================
pnpm run clean
pause
"@

    $e2eTestContent = @"
@echo off
cd /d "%~dp0"
echo ===================================================
echo   $appDisplayName - Run E2E Tests
echo ===================================================
pnpm run test:e2e
pause
"@

    # Write files
    Set-Content -Path (Join-Path $appDir "1_INSTALL.bat") -Value $installContent
    Set-Content -Path (Join-Path $appDir "2_BUILD.bat") -Value $buildContent
    Set-Content -Path (Join-Path $appDir "3_START_DEV.bat") -Value $startDevContent
    Set-Content -Path (Join-Path $appDir "4_START_PROD.bat") -Value $startProdContent
    Set-Content -Path (Join-Path $appDir "5_PACKAGE.bat") -Value $packageContent
    Set-Content -Path (Join-Path $appDir "6_TEST.bat") -Value $testContent
    Set-Content -Path (Join-Path $appDir "7_CLEAN.bat") -Value $cleanContent
    Set-Content -Path (Join-Path $appDir "8_E2E_TEST.bat") -Value $e2eTestContent

    Write-Host "Created parity scripts in $appDir."
}

Write-Host "All One-Click Deploy scripts have been generated successfully."
