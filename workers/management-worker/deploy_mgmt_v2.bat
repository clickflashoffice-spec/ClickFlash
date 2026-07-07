@echo off
set HOME=C:\Users\alamo
echo [MGMT-DEPLOY] Starting at %TIME% > mgmt_deploy_v2.log
echo [MGMT-DEPLOY] Installing local dependencies... >> mgmt_deploy_v2.log
call npm install --legacy-peer-deps --quiet >> mgmt_deploy_v2.log 2>&1
echo [MGMT-DEPLOY] Deploying worker... >> mgmt_deploy_v2.log
call npx --yes wrangler deploy >> mgmt_deploy_v2.log 2>&1
echo [MGMT-DEPLOY] Finished at %TIME% with errorlevel %ERRORLEVEL% >> mgmt_deploy_v2.log
