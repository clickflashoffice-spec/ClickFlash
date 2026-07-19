<#
.SYNOPSIS
    Purges compromised secrets from the entire Git history of the ClickFlash repository.

.DESCRIPTION
    This script performs an aggressive `git filter-branch` to remove specific files 
    that contained compromised credentials (such as private_key.pem and embedded 
    wrangler secrets) from the entire Git commit history.

    WARNING: This will rewrite Git history. Do not run this while other developers 
    are actively pushing. Everyone will need to clone a fresh copy after this is 
    force-pushed to the remote.

.NOTES
    Targeted Files:
    - apps/cloud-backend/private_key.pem
    - stale Management bundle Google key references
    - embedded Wrangler secrets
#>

$ErrorActionPreference = "Stop"

Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host " ClickFlash - Git History Secret Purge Utility" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "WARNING: This script will perform a destructive rewrite of the local Git history." -ForegroundColor Red
Write-Host "Make sure you have a backup of the repository before proceeding." -ForegroundColor Red
Write-Host ""

$confirmation = 'PURGE'
if ($confirmation -cne 'PURGE') {
    Write-Host "Aborting." -ForegroundColor Green
    exit
}

Write-Host "`n[1/3] Removing apps/cloud-backend/private_key.pem from all history..." -ForegroundColor Cyan
# Uses filter-branch to remove the specific PEM file
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch apps/cloud-backend/private_key.pem' --prune-empty --tag-name-filter cat -- --all

Write-Host "`n[2/3] Removing stale Management bundle Google key and Wrangler secrets..." -ForegroundColor Cyan
# If there are specific wrangler secret files like .dev.vars or wrangler.toml backups that need removing:
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch apps/cloud-backend/.dev.vars apps/management/.env.local' --prune-empty --tag-name-filter cat -- --all

Write-Host "`n[3/3] Cleaning up reflogs and enforcing garbage collection..." -ForegroundColor Cyan
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "`n=========================================================" -ForegroundColor Yellow
Write-Host " Purge Complete!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host "The local repository history has been rewritten to exclude the compromised secrets."
Write-Host "To synchronize this with the remote repository, you must force push:"
Write-Host ""
Write-Host "    git push origin --force --all" -ForegroundColor Cyan
Write-Host "    git push origin --force --tags" -ForegroundColor Cyan
Write-Host ""
Write-Host "Notify the team that they must re-clone the repository. Do not allow them to pull."
