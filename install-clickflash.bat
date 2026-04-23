@echo off
REM ============================================================
REM ClickFlash 1-Click Installation for Windows
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   ClickFlash Master - 1-Click Installation
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo         Please install Node.js 20.x from https://nodejs.org
    pause
    exit /b 1
)

REM Get Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%

REM Get installation directory
set "INSTALL_DIR=%~dp0"
set "MASTER_DIR=%INSTALL_DIR%apps\master"
set "DATA_DIR=%MASTER_DIR%\pb_data"

echo [INFO] Installation directory: %INSTALL_DIR%

REM Check for existing installation
if exist "%DATA_DIR%\bootstrap.json" (
    echo.
    echo [INFO] Installation detected!
    set /p REINSTALL="Do you want to reinstall? This will reset all data. (y/N): "
    if /i not "!REINSTALL!"=="y" (
        goto :start_master
    )
    del "%DATA_DIR%\bootstrap.json" 2>nul
)

REM ============================================================
REM Get hotel name via PowerShell input dialog
REM ============================================================
echo.
echo [STEP 1] Enter Hotel/Destination Name...
echo.

for /f "tokens=*" %%i in ('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; $form.Text = 'ClickFlash Installation - Hotel Name'; $form.Width = 500; $form.Height = 180; $form.StartPosition = 'CenterScreen'; $label = New-Object System.Windows.Forms.Label; $label.Text = 'Enter Hotel / Destination Name:'; $label.Location = '20,30'; $label.AutoSize = $true; $textBox = New-Object System.Windows.Forms.TextBox; $textBox.Location = '20,60'; $textBox.Width = 440; $button = New-Object System.Windows.Forms.Button; $button.Text = 'Continue'; $button.DialogResult = [System.Windows.Forms.DialogResult]::OK; $button.Location = '190,100'; $form.Controls.Add($label); $form.Controls.Add($textBox); $form.Controls.Add($button); $form.AcceptButton = $button; if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $textBox.Text }"') do set HOTEL_NAME=%%i

REM Clean up
set "HOTEL_NAME=%HOTEL_NAME: =%"
set "HOTEL_NAME=%HOTEL_NAME:~0,50%"

if "%HOTEL_NAME%"=="" (
    echo [ERROR] Hotel name cannot be empty!
    pause
    exit /b 1
)

echo [INFO] Hotel Name: %HOTEL_NAME%

REM ============================================================
REM Get admin email
REM ============================================================
echo.
echo [STEP 2] Enter Admin Email Address...
echo.

for /f "tokens=*" %%i in ('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; $form.Text = 'ClickFlash Installation - Admin Email'; $form.Width = 500; $form.Height = 180; $form.StartPosition = 'CenterScreen'; $label = New-Object System.Windows.Forms.Label; $label.Text = 'Enter Admin Email:'; $label.Location = '20,30'; $label.AutoSize = $true; $textBox = New-Object System.Windows.Forms.TextBox; $textBox.Location = '20,60'; $textBox.Width = 440; $textBox.Text = 'admin@%HOTEL_NAME%.clickflash.photo'; $button = New-Object System.Windows.Forms.Button; $button.Text = 'Continue'; $button.DialogResult = [System.Windows.Forms.DialogResult]::OK; $button.Location = '190,100'; $form.Controls.Add($label); $form.Controls.Add($textBox); $form.Controls.Add($button); $form.AcceptButton = $button; if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $textBox.Text }"') do set ADMIN_EMAIL=%%i

REM Clean up
set "ADMIN_EMAIL=%ADMIN_EMAIL: =%"

if "%ADMIN_EMAIL%"=="" (
    echo [ERROR] Admin email cannot be empty!
    pause
    exit /b 1
)

echo [INFO] Admin Email: %ADMIN_EMAIL%

REM ============================================================
REM Get admin password with confirmation
REM ============================================================
echo.
echo [STEP 3] Set Admin Password...
echo.

for /f "tokens=*" %%i in ('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; $form.Text = 'ClickFlash Installation - Set Password'; $form.Width = 500; $form.Height = 280; $form.StartPosition = 'CenterScreen'; $label = New-Object System.Windows.Forms.Label; $label.Text = 'Enter Admin Password (min 8 characters):'; $label.Location = '20,20'; $label.AutoSize = $true; $passBox = New-Object System.Windows.Forms.TextBox; $passBox.UseSystemPasswordChar = $true; $passBox.Location = '20,50'; $passBox.Width = 440; $label2 = New-Object System.Windows.Forms.Label; $label2.Text = 'Confirm Password:'; $label2.Location = '20,90'; $label2.AutoSize = $true; $passBox2 = New-Object System.Windows.Forms.TextBox; $passBox2.UseSystemPasswordChar = $true; $passBox2.Location = '20,120'; $passBox2.Width = 440; $label3 = New-Object System.Windows.Forms.Label; $label3.Text = 'Password must be at least 8 characters'; $label3.ForeColor = 'Gray'; $label3.Location = '20,150'; $label3.AutoSize = $true; $button = New-Object System.Windows.Forms.Button; $button.Text = 'Install'; $button.DialogResult = [System.Windows.Forms.DialogResult]::OK; $button.Location = '180,185'; $form.Controls.Add($label); $form.Controls.Add($passBox); $form.Controls.Add($label2); $form.Controls.Add($passBox2); $form.Controls.Add($label3); $form.Controls.Add($button); $form.AcceptButton = $button; $result = $form.ShowDialog(); if ($result -eq [System.Windows.Forms.DialogResult]::OK -and $passBox.Text -eq $passBox2.Text -and $passBox.Text.Length -ge 8) { Write-Output $passBox.Text } else { if ($passBox.Text.Length -lt 8) { Write-Output 'ERROR:TOO_SHORT' } else { Write-Output 'ERROR:MISMATCH' } }"') do set ADMIN_PASS=%%i

if "%ADMIN_PASS%"=="ERROR:TOO_SHORT" (
    echo [ERROR] Password must be at least 8 characters!
    pause
    exit /b 1
)

if "%ADMIN_PASS%"=="ERROR:MISMATCH" (
    echo [ERROR] Passwords do not match!
    pause
    exit /b 1
)

if "%ADMIN_PASS%"=="" (
    echo [ERROR] Password cannot be empty!
    pause
    exit /b 1
)

echo [INFO] Password: *********

REM ============================================================
REM Show Cloudflare setup option
REM ============================================================
echo.
echo [STEP 4] Cloudflare Configuration...
echo.

for /f "tokens=*" %%i in ('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; $form.Text = 'ClickFlash - Cloudflare Setup'; $form.Width = 500; $form.Height = 350; $form.StartPosition = 'CenterScreen'; $label = New-Object System.Windows.Forms.Label; $label.Text = 'Cloudflare Setup (Optional):'; $label.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold); $label.Location = '20,20'; $label.AutoSize = $true; $label2 = New-Object System.Windows.Forms.Label; $label2.Text = 'If you have a Cloudflare API token, enter it below.'; $label2.ForeColor = 'Gray'; $label2.Location = '20,50'; $label2.AutoSize = $true; $label3 = New-Object System.Windows.Forms.Label; $label3.Text = 'API Token:'; $label3.Location = '20,85'; $label3.AutoSize = $true; $tokenBox = New-Object System.Windows.Forms.TextBox; $tokenBox.Location = '20,110'; $tokenBox.Width = 440; $label4 = New-Object System.Windows.Forms.Label; $label4.Text = 'Account ID:'; $label4.Location = '20,145'; $label4.AutoSize = $true; $accountBox = New-Object System.Windows.Forms.TextBox; $accountBox.Location = '20,170'; $accountBox.Width = 440; $label5 = New-Object System.Windows.Forms.Label; $label5.Text = 'Zone ID:'; $label5.Location = '20,205'; $label5.AutoSize = $true; $zoneBox = New-Object System.Windows.Forms.TextBox; $zoneBox.Location = '20,230'; $zoneBox.Width = 440; $button = New-Object System.Windows.Forms.Button; $button.Text = 'Skip (Use Local Only)'; $button.DialogResult = [System.Windows.Forms.DialogResult]::No; $button.Location = '130,270'; $button2 = New-Object System.Windows.Forms.Button; $button2.Text = 'Configure Cloudflare'; $button2.DialogResult = [System.Windows.Forms.DialogResult]::Yes; $button2.Location = '290,270'; $form.Controls.Add($label); $form.Controls.Add($label2); $form.Controls.Add($label3); $form.Controls.Add($tokenBox); $form.Controls.Add($label4); $form.Controls.Add($accountBox); $form.Controls.Add($label5); $form.Controls.Add($zoneBox); $form.Controls.Add($button); $form.Controls.Add($button2); if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::Yes) { Write-Output ('TOKEN=' + $tokenBox.Text + '|ACCOUNT=' + $accountBox.Text + '|ZONE=' + $zoneBox.Text) } else { Write-Output 'SKIP' }"') do set CF_CONFIG=%%i

REM Parse Cloudflare config
set "CF_TOKEN="
set "CF_ACCOUNT=
set "CF_ZONE=

if not "%CF_CONFIG%"=="SKIP" (
    for /f "tokens=1,2,3 delims=|" %%a in ("!CF_CONFIG!") do (
        set "CF_TOKEN=%%a"
        set "CF_ACCOUNT=%%b"
        set "CF_ZONE=%%c"
    )
    REM Remove "TOKEN=" prefix
    set "CF_TOKEN=!CF_TOKEN:TOKEN=!"
    set "CF_ACCOUNT=!CF_ACCOUNT:ACCOUNT=!"
    set "CF_ZONE=!CF_ZONE:ZONE=!
)

REM ============================================================
REM Create data directory and bootstrap.json
REM ============================================================
echo.
echo [INFO] Creating bootstrap configuration...

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

(
echo {
echo   "locationName": "%HOTEL_NAME%",
echo   "adminEmail": "%ADMIN_EMAIL%",
echo   "adminPassword": "%ADMIN_PASS%",
echo   "hubUrl": "https://hub.clickflash.photo"
REM Add Cloudflare config if provided
if defined CF_TOKEN (
echo   ,
echo   "cloudflareConfig": {
echo     "apiToken": "%CF_TOKEN%",
echo     "accountId": "%CF_ACCOUNT%",
echo     "zoneId": "%CF_ZONE%",
echo     "domain": "clickflash.photo"
echo   }
)
echo }
) > "%DATA_DIR%\bootstrap.json"

echo [SUCCESS] bootstrap.json created at: %DATA_DIR%\bootstrap.json
echo.

REM ============================================================
REM Install dependencies if needed
REM ============================================================
echo [INFO] Checking dependencies...

cd /d "%MASTER_DIR%"
if not exist "node_modules" (
    echo [INFO] Installing dependencies (this may take a few minutes)...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
)

REM ============================================================
REM Start Master Portal
REM ============================================================
:start_master
echo.
echo ============================================================
echo   Starting ClickFlash Master Portal...
echo ============================================================
echo.
echo [INFO] The system will auto-provision on first run.
echo.
echo Access URLs:
echo   Local:    http://localhost:8090
if defined CF_TOKEN (
    echo   Master:   https://%HOTEL_NAME%.master.clickflash.photo
    echo   Gallery:  https://%HOTEL_NAME%.gallery.clickflash.photo
    echo   Manager:  https://%HOTEL_NAME%.management.clickflash.photo
)
echo.
echo Press Ctrl+C to stop the server.
echo.

cd /d "%MASTER_DIR%"
call npm run dev:full

pause
