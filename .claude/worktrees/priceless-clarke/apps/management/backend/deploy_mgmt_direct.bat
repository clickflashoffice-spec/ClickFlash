@echo off
set HOME=C:\Users\alamo
echo [MGMT-DEPLOY-DIRECT] Starting at %TIME% > mgmt_deploy_direct.log
echo [MGMT-DEPLOY-DIRECT] Running wrangler deploy directly... >> mgmt_deploy_direct.log
call npx --yes wrangler deploy >> mgmt_deploy_direct.log 2>&1
echo [MGMT-DEPLOY-DIRECT] Finished at %TIME% with errorlevel %ERRORLEVEL% >> mgmt_deploy_direct.log
