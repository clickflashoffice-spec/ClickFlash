@echo off
set HOME=C:\Users\alamo
echo [WEBSITE-INSTALL] Starting at %TIME% > build_v2.log
call npm install --legacy-peer-deps --quiet >> build_v2.log 2>&1
echo [WEBSITE-BUILD] Starting at %TIME% >> build_v2.log
call npx --yes next build >> build_v2.log 2>&1
echo [WEBSITE-BUILD] Finished at %TIME% with errorlevel %ERRORLEVEL% >> build_v2.log
