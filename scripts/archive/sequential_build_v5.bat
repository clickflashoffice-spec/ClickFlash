@echo off
echo [SEQUENTIAL-BUILD-V5] Starting at %TIME% > sequential_build.log

:: [1/3] Website (Static HTML - Vite)
echo [WEBSITE-START] %TIME% >> sequential_build.log
if exist out/index.html (
    echo [1/3] Website already built. Skipping... >> sequential_build.log
) else (
    cd apps/website
    npm install --ignore-scripts >> ../../sequential_build.log 2>&1
    npm run build >> ../../sequential_build.log 2>&1
    set WEB_RESULT=%ERRORLEVEL%
    cd ../..
    echo [WEBSITE-VITE-RESULT] %WEB_RESULT% >> sequential_build.log
)

:: [2/3] GALLERY (React - Vite)
echo [GALLERY-START] %TIME% >> sequential_build.log
cd apps/gallery

:: Backup package.json
copy package.json package.json.bak > nul

:: Remove native dependencies for frontend build
powershell -Command "(Get-Content package.json) -replace '\"bcrypt\": \".*?\",?', '' -replace '\"better-sqlite3\": \".*?\",?', '' | Set-Content package.json"

:: Clean node_modules
if exist node_modules rmdir /s /q node_modules

npm install --ignore-scripts >> ../../sequential_build.log 2>&1
npm run build >> ../../sequential_build.log 2>&1
set GALLERY_RESULT=%ERRORLEVEL%

:: Restore
move /y package.json.bak package.json > nul

cd ../..
echo [GALLERY-VITE-RESULT] %GALLERY_RESULT% >> sequential_build.log
echo [GALLERY-END] %TIME% >> sequential_build.log

:: [3/3] MANAGEMENT HUB (React - Vite)
echo [MGMT-START] %TIME% >> sequential_build.log
cd apps/management

:: Backup package.json
copy package.json package.json.bak > nul

:: Remove native dependencies for frontend build
powershell -Command "(Get-Content package.json) -replace '\"bcrypt\": \".*?\",?', '' -replace '\"better-sqlite3\": \".*?\",?', '' | Set-Content package.json"

:: Clean node_modules
if exist node_modules rmdir /s /q node_modules

npm install --ignore-scripts >> ../../sequential_build.log 2>&1
npm run build >> ../../sequential_build.log 2>&1
set MGMT_RESULT=%ERRORLEVEL%

:: Restore
move /y package.json.bak package.json > nul

cd ../..
echo [MGMT-VITE-RESULT] %MGMT_RESULT% >> sequential_build.log
echo [MGMT-END] %TIME% >> sequential_build.log

echo [SEQUENTIAL-BUILD-V5] Finished at %TIME% >> sequential_build.log
