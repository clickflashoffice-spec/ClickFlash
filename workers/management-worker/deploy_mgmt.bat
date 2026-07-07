@echo off
set HOME=C:\Users\alamo
echo [MGMT-DEPLOY] Starting at %TIME% > mgmt_deploy.log
call npx wrangler deploy >> mgmt_deploy.log 2>&1
echo [MGMT-DEPLOY] Finished at %TIME% with errorlevel %ERRORLEVEL% >> mgmt_deploy.log
