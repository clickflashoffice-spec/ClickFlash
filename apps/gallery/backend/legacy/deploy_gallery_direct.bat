@echo off
set HOME=C:\Users\alamo
echo [GALLERY-DEPLOY-DIRECT] Starting at %TIME% > gallery_deploy_direct.log
echo [GALLERY-DEPLOY-DIRECT] Running wrangler deploy directly... >> gallery_deploy_direct.log
call npx --yes wrangler deploy >> gallery_deploy_direct.log 2>&1
echo [GALLERY-DEPLOY-DIRECT] Finished at %TIME% with errorlevel %ERRORLEVEL% >> gallery_deploy_direct.log
