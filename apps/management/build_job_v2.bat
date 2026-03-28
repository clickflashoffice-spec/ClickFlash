@echo off
set HOME=C:\Users\alamo
echo [MGMT-INSTALL] Starting at %TIME% > build_v2.log
call npm install --legacy-peer-deps --quiet >> build_v2.log 2>&1
echo [MGMT-BUILD] Starting at %TIME% >> build_v2.log
call npx --yes vite build >> build_v2.log 2>&1
echo [MGMT-BUILD] Finished at %TIME% with errorlevel %ERRORLEVEL% >> build_v2.log
