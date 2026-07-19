[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
    [ValidateSet("staging", "production")]
    [string]$Environment = "staging",

    [switch]$SkipTests,
    [switch]$SkipMigrations,
    [switch]$SkipFrontends
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$originalLocation = Get-Location
$environmentArgs = if ($Environment -eq "staging") { @("--env", "staging") } else { @("--env=") }
$pagesBranch = if ($Environment -eq "production") { "main" } else { "staging" }

$workers = @(
    @{ Name = "Gallery API"; Path = "workers/gallery-worker"; Package = "gallery-backend" },
    @{ Name = "Management API"; Path = "workers/management-worker"; Package = "management-backend" },
    @{ Name = "MoneyTrash API"; Path = "workers/moneytrash-worker"; Package = "moneytrash-cloudflare-api" },
    @{ Name = "Update API"; Path = "workers/update-server"; Package = "clickflash-update-server" }
)

$migrationTargets = @(
    @{ Name = "Gallery DB"; Path = "workers/gallery-worker"; Production = "gallery-db"; Staging = "gallery-db-staging" },
    @{ Name = "Website DB"; Path = "workers/gallery-worker"; Production = "clickflash-website-db"; Staging = "clickflash-website-db-staging" },
    @{ Name = "Management DB"; Path = "workers/management-worker"; Production = "management-db"; Staging = "management-db-staging" },
    @{ Name = "MoneyTrash DB"; Path = "workers/moneytrash-worker"; Production = "moneytrash-db"; Staging = "moneytrash-db-staging" }
)

function Invoke-Checked {
    param(
        [Parameter(Mandatory)] [string]$Label,
        [Parameter(Mandatory)] [string]$WorkingDirectory,
        [Parameter(Mandatory)] [string[]]$Arguments
    )

    Write-Host "`n[$Label]" -ForegroundColor Yellow
    Push-Location (Join-Path $repoRoot $WorkingDirectory)
    try {
        & pnpm @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

function Assert-RepositoryLayout {
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "pnpm is required but was not found on PATH."
    }

    foreach ($worker in $workers) {
        $manifest = Join-Path $repoRoot "$($worker.Path)/package.json"
        $config = Join-Path $repoRoot "$($worker.Path)/wrangler.toml"
        if (-not (Test-Path -LiteralPath $manifest)) { throw "Missing $manifest" }
        if (-not (Test-Path -LiteralPath $config)) { throw "Missing $config" }
    }

    if ($Environment -eq "staging") {
        $configs = @(
            "workers/gallery-worker/wrangler.toml",
            "workers/management-worker/wrangler.toml",
            "workers/moneytrash-worker/wrangler.toml"
        )
        foreach ($relativePath in $configs) {
            $contents = Get-Content -Raw -LiteralPath (Join-Path $repoRoot $relativePath)
            if ($contents -match "STAGING_[A-Z0-9_]+_HERE") {
                throw "Staging resources are not provisioned in $relativePath. Replace placeholder IDs before deployment."
            }
        }
    }
}

function Invoke-Validation {
    if (-not $SkipTests) {
        Invoke-Checked "Gallery typecheck" "." @("--filter", "gallery-backend", "run", "typecheck")
        Invoke-Checked "Gallery tests" "." @("--filter", "gallery-backend", "run", "test")
        Invoke-Checked "Management typecheck" "." @("--filter", "management-backend", "run", "build")
        Invoke-Checked "Management tests" "." @("--filter", "management-backend", "run", "test")
        Invoke-Checked "MoneyTrash typecheck" "." @("--filter", "moneytrash-cloudflare-api", "run", "typecheck")
        Invoke-Checked "MoneyTrash tests" "." @("--filter", "moneytrash-cloudflare-api", "run", "test")
    }

    foreach ($worker in $workers) {
        Invoke-Checked "$($worker.Name) bundle check" $worker.Path (@("exec", "wrangler", "deploy", "--dry-run") + $environmentArgs)
    }

    if (-not $SkipFrontends) {
        Invoke-Checked "Gallery frontend build" "." @("--filter", "star-master-customer", "run", "build")
        Invoke-Checked "Management frontend build" "." @("--filter", "star-master-management", "run", "build")
        Invoke-Checked "Website build" "." @("--filter", "main-website", "run", "build")
    }
}

function Invoke-Migrations {
    if ($SkipMigrations) { return }

    foreach ($target in $migrationTargets) {
        $database = if ($Environment -eq "production") { $target.Production } else { $target.Staging }
        if ($PSCmdlet.ShouldProcess("$database ($Environment)", "Apply remote D1 migrations")) {
            Invoke-Checked "$($target.Name) migrations" $target.Path (@("exec", "wrangler", "d1", "migrations", "apply", $database, "--remote") + $environmentArgs)
        }
    }
}

function Invoke-Deployments {
    foreach ($worker in $workers) {
        if ($PSCmdlet.ShouldProcess("$($worker.Name) ($Environment)", "Deploy Cloudflare Worker")) {
            Invoke-Checked "Deploy $($worker.Name)" $worker.Path (@("exec", "wrangler", "deploy") + $environmentArgs)
        }
    }

    if (-not $SkipFrontends) {
        $pages = @(
            @{ Name = "Gallery Pages"; Path = "apps/gallery"; Project = "click-flash-gallery" },
            @{ Name = "Management Pages"; Path = "apps/management"; Project = "management-hub" }
        )
        foreach ($page in $pages) {
            if ($PSCmdlet.ShouldProcess("$($page.Name) ($Environment)", "Deploy Cloudflare Pages")) {
                Invoke-Checked "Deploy $($page.Name)" $page.Path @(
                    "exec", "wrangler", "pages", "deploy", "dist",
                    "--project-name", $page.Project,
                    "--branch", $pagesBranch
                )
            }
        }

        Write-Host "Website deployment remains owned by its Cloudflare/GitHub integration; the production build was validated only." -ForegroundColor Cyan
    }
}

try {
    Set-Location $repoRoot
    Write-Host "ClickFlash cloud release target: $Environment" -ForegroundColor Cyan
    Assert-RepositoryLayout
    Invoke-Validation
    Invoke-Migrations
    Invoke-Deployments
    Write-Host "`nCloud release workflow completed for $Environment." -ForegroundColor Green
}
finally {
    Set-Location $originalLocation
}
