@echo off
set HOME=C:\Users\alamo
echo [WEBSITE-INSTALL] Starting at %TIME% > build.log
call npm install --legacy-peer-deps --quiet >> build.log 2>&1
echo [WEBSITE-BUILD] Starting at %TIME% >> build.log
call npx --yes next build >> build.log 2>&1
echo [WEBSITE-BUILD] Finished at %TIME% with errorlevel %ERRORLEVEL% >> build.log
