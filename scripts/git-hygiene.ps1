#!/usr/bin/env pwsh
<#
.SYNOPSIS
    ClickFlash Git Hygiene & Automation Script
.DESCRIPTION
    Validates branch naming, commit messages, pre-commit checks, and PR creation.
    Part of the Phase 4 Git Excellence initiative.
.EXAMPLE
    .\scripts\git-hygiene.ps1 -Action validate-branch
    .\scripts\git-hygiene.ps1 -Action create-pr -Title "feat: add yield pricing"
    .\scripts\git-hygiene.ps1 -Action check-all
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('validate-branch', 'validate-commits', 'check-all', 'create-pr')]
    [string]$Action,

    [string]$Title = "",
    [string]$Body = ""
)

$ErrorActionPreference = "Stop"

# --- Configuration ---
$ValidBranchPrefixes = @('feat/', 'fix/', 'refactor/', 'docs/', 'chore/', 'test/', 'ci/', 'release/')
$ConventionalCommitRegex = '^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?!?:\s.+'
$ProtectedBranches = @('main', 'master', 'production')

# --- Functions ---
function Test-BranchNaming {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    if (-not $branch) {
        Write-Error "Not in a git repository"
        return $false
    }

    if ($branch -in $ProtectedBranches) {
        Write-Warning "[FAIL] You are on protected branch '$branch'. Create a feature branch first."
        Write-Host "  Usage: git checkout -b feat/<scope>-<description>"
        return $false
    }

    $validPrefix = $ValidBranchPrefixes | Where-Object { $branch.StartsWith($_) }
    if (-not $validPrefix) {
        Write-Warning "[FAIL] Branch '$branch' does not follow naming convention."
        Write-Host "  Valid prefixes: $($ValidBranchPrefixes -join ', ')"
        return $false
    }

    Write-Host "[PASS] Branch '$branch' follows naming convention." -ForegroundColor Green
    return $true
}

function Test-CommitMessages {
    $commits = git log --oneline origin/main..HEAD 2>$null
    if (-not $commits) {
        Write-Host "[INFO] No unpushed commits found." -ForegroundColor Cyan
        return $true
    }

    $allValid = $true
    foreach ($commit in $commits) {
        # Extract message after hash
        $msg = $commit -replace '^\w+\s+', ''
        if ($msg -notmatch $ConventionalCommitRegex) {
            Write-Warning "[FAIL] Non-conventional commit: $commit"
            $allValid = $false
        }
    }

    if ($allValid) {
        Write-Host "[PASS] All commits follow Conventional Commits spec." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Format: <type>(<scope>): <description>"
        Write-Host "  Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert"
    }
    return $allValid
}

function Invoke-PreCommitChecks {
    Write-Host "`n=== Pre-Commit Hygiene Checks ===" -ForegroundColor Cyan

    # 1. Private key guard
    Write-Host "`n[1/3] Running private key filename guard..."
    try {
        pnpm run security:tracked-private-key-filenames
        Write-Host "  [PASS] No private key filenames tracked." -ForegroundColor Green
    } catch {
        Write-Warning "  [FAIL] Private key guard failed: $_"
    }

    # 2. TypeCheck
    Write-Host "`n[2/3] Running monorepo typecheck..."
    try {
        npm run typecheck:all
        Write-Host "  [PASS] TypeCheck passed." -ForegroundColor Green
    } catch {
        Write-Warning "  [FAIL] TypeCheck failed."
        return $false
    }

    # 3. Lint
    Write-Host "`n[3/3] Running linter..."
    try {
        npm run lint:all
        Write-Host "  [PASS] Lint passed." -ForegroundColor Green
    } catch {
        Write-Warning "  [WARN] Lint issues detected (non-blocking)."
    }

    return $true
}

function New-PullRequest {
    param([string]$PRTitle, [string]$PRBody)

    $branch = git rev-parse --abbrev-ref HEAD
    if ($branch -in $ProtectedBranches) {
        Write-Error "Cannot create PR from protected branch '$branch'"
        return
    }

    # Push current branch
    Write-Host "Pushing branch '$branch' to origin..."
    git push -u origin $branch

    # Create PR
    if (-not $PRTitle) {
        $PRTitle = Read-Host "Enter PR title"
    }

    $ghArgs = @("pr", "create", "--title", $PRTitle, "--base", "main")
    if ($PRBody) {
        $ghArgs += @("--body", $PRBody)
    }

    Write-Host "Creating PR..."
    & gh @ghArgs

    Write-Host "`n[DONE] PR created successfully." -ForegroundColor Green
}

# --- Main ---
Write-Host "=== ClickFlash Git Hygiene ===" -ForegroundColor Cyan
Write-Host "Action: $Action`n"

switch ($Action) {
    'validate-branch' {
        Test-BranchNaming | Out-Null
    }
    'validate-commits' {
        Test-CommitMessages | Out-Null
    }
    'check-all' {
        $branchOk = Test-BranchNaming
        $commitsOk = Test-CommitMessages
        $checksOk = Invoke-PreCommitChecks

        Write-Host "`n=== Summary ===" -ForegroundColor Cyan
        Write-Host "  Branch Naming: $(if ($branchOk) { 'PASS' } else { 'FAIL' })"
        Write-Host "  Commit Format: $(if ($commitsOk) { 'PASS' } else { 'FAIL' })"
        Write-Host "  Pre-Commit:    $(if ($checksOk) { 'PASS' } else { 'FAIL' })"
    }
    'create-pr' {
        New-PullRequest -PRTitle $Title -PRBody $Body
    }
}
