@echo off
set HOME=C:\Users\alamo
echo [DEPLOY] Starting at %TIME% > deploy_run.log
powershell -ExecutionPolicy Bypass -File .\deploy_ecosystem.ps1 >> deploy_run.log 2>&1
echo [DEPLOY] Finished at %TIME% >> deploy_run.log
