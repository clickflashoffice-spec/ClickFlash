# ClickFlash unified web build and deployment script

$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$managementDir = Join-Path $repoRoot "apps/management"
$galleryDir = Join-Path $repoRoot "apps/gallery"
$websiteDir = Join-Path $repoRoot "apps/website"

function Reset-WorkspaceDirectory {
    param([Parameter(Mandatory = $true)][string]$Path)

    $resolvedPath = [IO.Path]::GetFullPath($Path)
    $workspacePrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedPath.StartsWith($workspacePrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clear a directory outside the workspace: $resolvedPath"
    }

    New-Item -ItemType Directory -Force -Path $resolvedPath | Out-Null
    Get-ChildItem -LiteralPath $resolvedPath -Force | Remove-Item -Recurse -Force
}

Write-Host "--- PHASE 0: CLEAN WEBSITE OUTPUT ---" -ForegroundColor Yellow
foreach ($directory in @((Join-Path $websiteDir "out"), (Join-Path $websiteDir ".next"))) {
    if (Test-Path -LiteralPath $directory) {
        Reset-WorkspaceDirectory -Path $directory
    }
}

Write-Host "--- PHASE 1: BUILD MANAGEMENT HUB ---" -ForegroundColor Cyan
Push-Location $managementDir
try {
    pnpm run build
} finally {
    Pop-Location
}
$manageDestination = Join-Path $websiteDir "public/manage"
Reset-WorkspaceDirectory -Path $manageDestination
Copy-Item -Path (Join-Path $managementDir "dist/*") -Destination $manageDestination -Recurse -Force

Write-Host "--- PHASE 2: BUILD CUSTOMER GALLERY ---" -ForegroundColor Cyan
Push-Location $galleryDir
try {
    pnpm run build
} finally {
    Pop-Location
}
$galleryDestination = Join-Path $websiteDir "public/gallery"
Reset-WorkspaceDirectory -Path $galleryDestination
Copy-Item -Path (Join-Path $galleryDir "dist/*") -Destination $galleryDestination -Recurse -Force

Write-Host "--- PHASE 3: BUILD WEBSITE ---" -ForegroundColor Cyan
Push-Location $websiteDir
try {
    pnpm run build

    Write-Host "--- PHASE 4: CLOUDFLARE DEPLOYMENT ---" -ForegroundColor Cyan
    pnpm exec wrangler pages deploy out --project-name=clickflash-website --commit-dirty=true
} finally {
    Pop-Location
}

Write-Host "--- SUCCESS: REBUILT FROM CURRENT WORKSPACE ---" -ForegroundColor Green
