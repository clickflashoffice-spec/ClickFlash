@echo off
set HOME=C:\Users\alamo
echo [GALLERY-INSTALL] Starting at %TIME% > build.log
call npm install --legacy-peer-deps --quiet >> build.log 2>&1
echo [GALLERY-BUILD] Starting at %TIME% >> build.log
call npx --yes vite build >> build.log 2>&1
echo [GALLERY-BUILD] Finished at %TIME% with errorlevel %ERRORLEVEL% >> build.log
