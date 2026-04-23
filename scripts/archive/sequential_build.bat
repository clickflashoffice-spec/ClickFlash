@echo off
set HOME=C:\Users\alamo
echo [SEQUENTIAL-BUILD] Starting at %TIME% > sequential_build.log

echo [1/3] Building Website...
cd apps\website
echo [WEBSITE-START] %TIME% >> ..\..\sequential_build.log
call npm install --legacy-peer-deps --quiet >> ..\..\sequential_build.log 2>&1
call npx --yes next build >> ..\..\sequential_build.log 2>&1
echo [WEBSITE-END] %TIME% (Error: %ERRORLEVEL%) >> ..\..\sequential_build.log
cd ..\..

echo [2/3] Building Gallery...
cd apps\gallery
echo [GALLERY-START] %TIME% >> ..\..\sequential_build.log
call npm install --legacy-peer-deps --quiet >> ..\..\sequential_build.log 2>&1
call npx --yes vite build >> ..\..\sequential_build.log 2>&1
echo [GALLERY-END] %TIME% (Error: %ERRORLEVEL%) >> ..\..\sequential_build.log
cd ..\..

echo [3/3] Building Management Hub...
cd apps\management
echo [MGMT-START] %TIME% >> ..\..\sequential_build.log
call npm install --legacy-peer-deps --quiet >> ..\..\sequential_build.log 2>&1
call npx --yes vite build >> ..\..\sequential_build.log 2>&1
echo [MGMT-END] %TIME% (Error: %ERRORLEVEL%) >> ..\..\sequential_build.log
cd ..\..

echo [SEQUENTIAL-BUILD] Finished at %TIME% >> sequential_build.log
