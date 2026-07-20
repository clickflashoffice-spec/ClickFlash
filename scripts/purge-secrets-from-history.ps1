# ============================================================================
# ClickFlash — Git History Secret Purge Script
# ============================================================================
# PURPOSE: Purge leaked credentials from Git history using git-filter-repo
# USAGE:   pwsh scripts/purge-secrets-from-history.ps1 [-Execute] [-SkipBackup]
#
# DEFAULT: Dry-run mode — prints what would happen without modifying anything
# PASS -Execute to actually run git filter-repo
#
# PREREQUISITE: pip install git-filter-repo (v2.47.0+ installed)
# ============================================================================

param(
    [switch]$Execute,
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    Write-Error "Not inside a Git repository."
    exit 1
}
Set-Location $repoRoot

# ── Configuration ────────────────────────────────────────────────────────────

# Known compromised secret values extracted from historical commits.
# These are the EXACT strings that must be replaced in Git history.
$secretReplacements = @(
    # Gallery wrangler.toml JWT_SECRET (commit 3be58be7)
    @{ Pattern = '<REDACTED:GALLERY_JWT_SECRET>'; Replace = '<REDACTED:GALLERY_JWT_SECRET>' }

    # Management wrangler.toml JWT_SECRET (commit 3be58be7)
    @{ Pattern = '<REDACTED:MANAGEMENT_JWT_SECRET>'; Replace = '<REDACTED:MANAGEMENT_JWT_SECRET>' }

    # Google API Key from embedded Management bundle (commits c4e78b89, cf477a6a)
    @{ Pattern = '<REDACTED:GOOGLE_API_KEY>'; Replace = '<REDACTED:GOOGLE_API_KEY>' }

    # Cloudflare Account ID (commit a060c6df) — optional but recommended
    @{ Pattern = '<REDACTED:CF_ACCOUNT_ID>'; Replace = '<REDACTED:CF_ACCOUNT_ID>' }
)

# Files to remove entirely from ALL history
$pathsToRemove = @(
    # Private key file (if it ever existed under this path)
    "apps/cloud-backend/private_key.pem"

    # Stale embedded Management bundle with Google API key
    "apps/website/public/manage/assets/AIChatBot-sgAbSDRl.js"
    "apps/website/public/manage/assets/ManagementSettingsPage-Doq8wCTP.js"

    # Agent backup files containing PEM markers and secret references
    ".agent_backup_old/skills/007/scripts/scanners/secrets_scanner.py"
    ".agent_backup_old/skills/cred-omega/SKILL.md"
    ".agent_backup_old/skills/k8s-manifest-generator/resources/implementation-playbook.md"

    # Claude worktree copies of wrangler configs with secrets
    ".claude/worktrees/priceless-clarke/apps/gallery/backend/wrangler.toml"
    ".claude/worktrees/priceless-clarke/apps/management/backend/wrangler.toml"
    ".claude/worktrees/priceless-clarke/apps/moneytrash/cloudflare/wrangler.toml"
    ".claude/worktrees/priceless-clarke/apps/management/src/components/management/settings/AiSettings.tsx"
)

# ── Banner ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║  ClickFlash — Git History Secret Purge                      ║" -ForegroundColor Red
Write-Host "║  THIS REWRITES ALL COMMIT SHAS — COLLABORATORS MUST RECLONE ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

if (-not $Execute) {
    Write-Host "  MODE: DRY RUN (pass -Execute to actually modify history)" -ForegroundColor Yellow
    Write-Host ""
}

# ── Pre-flight checks ───────────────────────────────────────────────────────

Write-Host "═══ Pre-flight Checks ═══" -ForegroundColor Cyan

# Check git-filter-repo is available
$filterRepo = python -m git_filter_repo --help 2>$null
if ($LASTEXITCODE -ne 0) {
    # Try direct command
    $filterRepo = git filter-repo --help 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git-filter-repo not found. Install: pip install git-filter-repo"
        exit 1
    }
}
Write-Host "  ✓ git-filter-repo available" -ForegroundColor Green

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "  ⚠ Uncommitted changes detected. Commit or stash before proceeding." -ForegroundColor Yellow
    if ($Execute) {
        Write-Error "Cannot execute with uncommitted changes. Commit or stash first."
        exit 1
    }
}
else {
    Write-Host "  ✓ Working tree clean" -ForegroundColor Green
}

# Check remote
$remote = git remote -v 2>$null
if ($remote) {
    Write-Host "  ✓ Remote configured (force-push will be needed after rewrite)" -ForegroundColor Green
}

# ── Step 1: Backup ──────────────────────────────────────────────────────────

Write-Host ""
Write-Host "═══ Step 1: Backup ═══" -ForegroundColor Cyan

$backupBranch = "backup-pre-purge-$(Get-Date -Format yyyyMMdd-HHmmss)"

if ($Execute -and -not $SkipBackup) {
    git branch $backupBranch
    Write-Host "  ✓ Backup branch created: $backupBranch" -ForegroundColor Green
}
else {
    Write-Host "  Would create backup branch: $backupBranch" -ForegroundColor DarkGray
}

# ── Step 2: Create replacements.txt ──────────────────────────────────────────

Write-Host ""
Write-Host "═══ Step 2: Build replacements.txt ═══" -ForegroundColor Cyan

$replacementsFile = Join-Path $repoRoot "scripts/.purge-replacements.txt"

$replacementsContent = @()
foreach ($r in $secretReplacements) {
    $replacementsContent += "literal:$($r.Pattern)==>$($r.Replace)"
    Write-Host "  Replace: $($r.Pattern.Substring(0, [Math]::Min(30, $r.Pattern.Length)))... → $($r.Replace)" -ForegroundColor DarkGray
}

if ($Execute) {
    $replacementsContent | Set-Content $replacementsFile -Encoding UTF8
    Write-Host "  ✓ Written: $replacementsFile" -ForegroundColor Green
}
else {
    Write-Host "  Would write $($replacementsContent.Count) replacement rules to $replacementsFile" -ForegroundColor DarkGray
}

# ── Step 3: Build filter-repo arguments ──────────────────────────────────────

Write-Host ""
Write-Host "═══ Step 3: Prepare git filter-repo command ═══" -ForegroundColor Cyan

# Build the --path arguments for file removal
$pathArgs = @()
foreach ($p in $pathsToRemove) {
    $pathArgs += "--path"
    $pathArgs += $p
    Write-Host "  Remove path: $p" -ForegroundColor DarkGray
}

# The full command combines:
# 1. --replace-text for inline secret replacement
# 2. --invert-paths --path ... for complete file removal
#
# git filter-repo requires these in separate passes if combining both operations.

Write-Host ""
Write-Host "  Pass 1: Replace inline secret values" -ForegroundColor Yellow
Write-Host "    git filter-repo --replace-text $replacementsFile --force" -ForegroundColor White

Write-Host ""
Write-Host "  Pass 2: Remove entire files" -ForegroundColor Yellow
$pathArgStr = ($pathsToRemove | ForEach-Object { "--path `"$_`"" }) -join " "
Write-Host "    git filter-repo --invert-paths $pathArgStr --force" -ForegroundColor White

# ── Step 4: Execute (if -Execute flag set) ───────────────────────────────────

if ($Execute) {
    Write-Host ""
    Write-Host "═══ Step 4: Executing git filter-repo ═══" -ForegroundColor Red

    # Confirm
    $confirm = Read-Host "  Type 'PURGE' to confirm history rewrite (this is irreversible)"
    if ($confirm -ne 'PURGE') {
        Write-Host "  Aborted." -ForegroundColor Yellow
        exit 0
    }

    Write-Host ""
    Write-Host "  Running Pass 1: Replace inline secrets..." -ForegroundColor Yellow
    git filter-repo --replace-text $replacementsFile --force
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pass 1 failed. Restore from backup branch: git checkout $backupBranch"
        exit 1
    }
    Write-Host "  ✓ Pass 1 complete" -ForegroundColor Green

    Write-Host ""
    Write-Host "  Running Pass 2: Remove secret-bearing files..." -ForegroundColor Yellow
    $filterArgs = @("filter-repo", "--invert-paths", "--force")
    foreach ($p in $pathsToRemove) {
        $filterArgs += "--path"
        $filterArgs += $p
    }
    & git @filterArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pass 2 failed. Restore from backup branch: git checkout $backupBranch"
        exit 1
    }
    Write-Host "  ✓ Pass 2 complete" -ForegroundColor Green

    # Clean up temp file
    Remove-Item $replacementsFile -ErrorAction SilentlyContinue
}
else {
    Write-Host ""
    Write-Host "═══ Step 4: SKIPPED (dry run) ═══" -ForegroundColor Yellow
}

# ── Step 5: Post-filter verification ─────────────────────────────────────────

Write-Host ""
Write-Host "═══ Step 5: Post-filter Verification ═══" -ForegroundColor Cyan

$verificationPatterns = @(
    "gallery-prod-jwt-secret"
    "uo4/b8fwePCa0IqO46WTEnrOpaOptOvOqR2GZx2TQ5g"
    "<REDACTED:GOOGLE_API_KEY>"
    "<REDACTED:CF_ACCOUNT_ID>"
)

$foundSecrets = $false
foreach ($pattern in $verificationPatterns) {
    if ($Execute) {
        $hits = git log --all -S $pattern --oneline 2>$null
        if ($hits) {
            Write-Host "  ✗ STILL FOUND: $($pattern.Substring(0, 20))..." -ForegroundColor Red
            $foundSecrets = $true
        }
        else {
            Write-Host "  ✓ Clean: $($pattern.Substring(0, 20))..." -ForegroundColor Green
        }
    }
    else {
        $hits = git log --all -S $pattern --oneline 2>$null
        $hitCount = if ($hits) { ($hits | Measure-Object).Count } else { 0 }
        Write-Host "  Would verify: $($pattern.Substring(0, 20))... (currently in $hitCount commits)" -ForegroundColor DarkGray
    }
}

foreach ($p in $pathsToRemove) {
    if ($Execute) {
        $pathHits = git log --all --oneline -- $p 2>$null
        if ($pathHits) {
            Write-Host "  ✗ PATH STILL IN HISTORY: $p" -ForegroundColor Red
            $foundSecrets = $true
        }
        else {
            Write-Host "  ✓ Path removed: $p" -ForegroundColor Green
        }
    }
    else {
        $pathHits = git log --all --oneline -- $p 2>$null
        $hitCount = if ($pathHits) { ($pathHits | Measure-Object).Count } else { 0 }
        Write-Host "  Would verify path removal: $p (currently in $hitCount commits)" -ForegroundColor DarkGray
    }
}

if ($Execute -and $foundSecrets) {
    Write-Host ""
    Write-Error "VERIFICATION FAILED: Some secrets remain in history. Manual investigation required."
    Write-Host "  Restore from backup: git checkout $backupBranch" -ForegroundColor Yellow
    exit 1
}

# ── Step 6: Push instructions ────────────────────────────────────────────────

Write-Host ""
Write-Host "═══ Step 6: Force Push ═══" -ForegroundColor Cyan

if ($Execute) {
    Write-Host "  History rewrite complete. To push:" -ForegroundColor Green
    Write-Host ""
    Write-Host "    git push origin --force --all" -ForegroundColor White
    Write-Host "    git push origin --force --tags" -ForegroundColor White
    Write-Host ""
    Write-Host "  ⚠ ALL collaborators must reclone after this push." -ForegroundColor Yellow
    Write-Host "  ⚠ Update Cloudflare Pages Git integration if connected." -ForegroundColor Yellow
}
else {
    Write-Host "  After executing, force-push with:" -ForegroundColor DarkGray
    Write-Host "    git push origin --force --all" -ForegroundColor DarkGray
    Write-Host "    git push origin --force --tags" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "═══ Done ═══" -ForegroundColor Cyan
if (-not $Execute) {
    Write-Host "  This was a DRY RUN. Pass -Execute to perform the actual purge." -ForegroundColor Yellow
}
