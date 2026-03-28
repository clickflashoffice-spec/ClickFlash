@echo off
set HOME=C:\Users\alamo
echo [SEQUENTIAL-BUILD-V3] Starting at %TIME% > sequential_build.log

:: Skip Website as it is already built
echo [1/3] Website already built. Skipping... >> sequential_build.log

echo [2/3] Building Gallery (Sanitized)...
cd apps\gallery
echo [GALLERY-START] %TIME% >> ..\..\sequential_build.log
:: Backup package.json
copy package.json package.json.bak > nul
:: Remove bcrypt and better-sqlite3 using PowerShell
powershell -Command "$json = Get-Content package.json | ConvertFrom-Json; $json.dependencies.PSObject.Properties.Remove('bcrypt'); $json.dependencies.PSObject.Properties.Remove('better-sqlite3'); $json | ConvertTo-Json -Depth 10 | Set-Content package.json"
:: Clean node_modules to avoid corruption from previous runs
rmdir /s /q node_modules > nul 2>&1
:: Install and build
call npm install --legacy-peer-deps --quiet >> ..\..\sequential_build.log 2>&1
call npx --yes vite build >> ..\..\sequential_build.log 2>&1
echo [GALLERY-VITE-RESULT] %ERRORLEVEL% >> ..\..\sequential_build.log
:: Revert package.json
move /y package.json.bak package.json > nul
echo [GALLERY-END] %TIME% >> ..\..\sequential_build.log
cd ..\..

echo [3/3] Building Management Hub (Sanitized)...
cd apps\management
echo [MGMT-START] %TIME% >> ..\..\sequential_build.log
:: Backup package.json
copy package.json package.json.bak > nul
:: Remove bcrypt and better-sqlite3
powershell -Command "$json = Get-Content package.json | ConvertFrom-Json; $json.dependencies.PSObject.Properties.Remove('bcrypt'); $json.dependencies.PSObject.Properties.Remove('better-sqlite3'); $json | ConvertTo-Json -Depth 10 | Set-Content package.json"
:: Clean node_modules
rmdir /s /q node_modules > nul 2>&1
:: Install and build
call npm install --legacy-peer-deps --quiet >> ..\..\sequential_build.log 2>&1
call npx --yes vite build >> ..\..\sequential_build.log 2>&1
echo [MGMT-VITE-RESULT] %ERRORLEVEL% >> ..\..\sequential_build.log
:: Revert package.json
move /y package.json.bak package.json > nul
echo [MGMT-END] %TIME% >> ..\..\sequential_build.log
cd ..\..

echo [SEQUENTIAL-BUILD-V3] Finished at %TIME% >> sequential_build.log
