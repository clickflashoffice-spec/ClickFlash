@echo off
set HOME=C:\Users\alamo
echo [SEQUENTIAL-BUILD-V2] Starting at %TIME% > sequential_build.log

:: Skip Website as it is already built
echo [1/3] Website already built. Skipping... >> sequential_build.log

echo [2/3] Building Gallery...
cd apps\gallery
echo [GALLERY-START] %TIME% >> ..\..\sequential_build.log
:: Use --ignore-scripts to skip bcrypt/better-sqlite3 compilation which isn't needed for the Vite bundle
call npm install --legacy-peer-deps --quiet --ignore-scripts >> ..\..\sequential_build.log 2>&1
call npx --yes vite build >> ..\..\sequential_build.log 2>&1
echo [GALLERY-END] %TIME% (Error: %ERRORLEVEL%) >> ..\..\sequential_build.log
cd ..\..

echo [3/3] Building Management Hub...
cd apps\management
echo [MGMT-START] %TIME% >> ..\..\sequential_build.log
call npm install --legacy-peer-deps --quiet --ignore-scripts >> ..\..\sequential_build.log 2>&1
call npx --yes vite build >> ..\..\sequential_build.log 2>&1
echo [MGMT-END] %TIME% (Error: %ERRORLEVEL%) >> ..\..\sequential_build.log
cd ..\..

echo [SEQUENTIAL-BUILD-V2] Finished at %TIME% >> sequential_build.log
