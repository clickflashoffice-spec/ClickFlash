@echo off
set SCRIPT_DIR=%~dp0
echo [DEPLOY] Starting at %TIME% > deploy_run.log
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%deploy-cloud.ps1" %* >> deploy_run.log 2>&1
echo [DEPLOY] Finished at %TIME% >> deploy_run.log
