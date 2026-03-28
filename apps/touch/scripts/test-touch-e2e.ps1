#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Touch Kiosk E2E Test Runner
    
.DESCRIPTION
    Runs comprehensive E2E tests for Touch Kiosk app:
    - Photo search flows (room number, face recognition)
    - Cart and checkout
    - Offline mode
    - Master synchronization
    - Accessibility and UX
    
.PARAMETER TestPattern
    Test pattern to run (default: all)
    
.PARAMETER Headed
    Run in headed mode (show browser)
    
.PARAMETER Debug
    Run in debug mode
    
.EXAMPLE
    .\test-touch-e2e.ps1
    .\test-touch-e2e.ps1 -TestPattern "cart"
    .\test-touch-e2e.ps1 -Headed
#>

param(
    [string]$TestPattern = "",
    [switch]$Headed,
    [switch]$Debug
)

$ErrorActionPreference = "Stop"

# Configuration
$TOUCH_URL = $env:TOUCH_URL -or "http://localhost:8091"
$MASTER_URL = $env:MASTER_URL -or "http://localhost:8090"
$RESULTS_FILE = "$env:TEMP\touch-e2e-results.json"

function Write-Header($text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-ServerConnection {
    param($Url, $Name)
    
    try {
        $response = Invoke-WebRequest -Uri "$Url/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

function Wait-ForServer {
    param($Url, $Name, $MaxAttempts = 30)
    
    Write-Host "Waiting for $Name to be ready..." -ForegroundColor Yellow -NoNewline
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        if (Test-ServerConnection -Url $Url -Name $Name) {
            Write-Host " READY!" -ForegroundColor Green
            return $true
        }
        Write-Host "." -ForegroundColor Yellow -NoNewline
        Start-Sleep -Seconds 1
    }
    
    Write-Host " TIMEOUT" -ForegroundColor Red
    return $false
}

# Main Execution
Write-Header "Touch Kiosk E2E Test Suite"

Write-Host "Configuration:"
Write-Host "  Touch URL:  $TOUCH_URL" -ForegroundColor Gray
Write-Host "  Master URL: $MASTER_URL" -ForegroundColor Gray
Write-Host "  Pattern:    $(if ($TestPattern) { $TestPattern } else { 'All tests' })" -ForegroundColor Gray
Write-Host "  Headed:     $Headed" -ForegroundColor Gray
Write-Host ""

# Check servers
Write-Host "Checking server connections..." -ForegroundColor Yellow

$touchReady = Wait-ForServer -Url $TOUCH_URL -Name "Touch Kiosk"
$masterReady = Wait-ForServer -Url $MASTER_URL -Name "Master Portal"

if (-not $touchReady) {
    Write-Host "ERROR: Touch Kiosk is not running at $TOUCH_URL" -ForegroundColor Red
    Write-Host "Start it with: cd apps/touch && npm run dev:full" -ForegroundColor Yellow
    exit 1
}

if (-not $masterReady) {
    Write-Host "WARNING: Master Portal is not running. Some tests may fail." -ForegroundColor Yellow
}

Write-Host ""

# Build Playwright command
$playwrightArgs = @("test")

if ($TestPattern) {
    $playwrightArgs += $TestPattern
}

$playwrightArgs += "--config=playwright.config.ts"

if ($Headed) {
    $playwrightArgs += "--headed"
}

if ($Debug) {
    $playwrightArgs += "--debug"
}

$playwrightArgs += "--reporter=list"

# Set environment variables
$env:TOUCH_URL = $TOUCH_URL
$env:MASTER_URL = $MASTER_URL

# Run tests
Write-Header "Running E2E Tests"

try {
    $startTime = Get-Date
    
    Push-Location $PSScriptRoot\..
    
    $cmd = "npx playwright $([string]::Join(' ', $playwrightArgs))"
    Write-Host "Executing: $cmd" -ForegroundColor Gray
    Write-Host ""
    
    Invoke-Expression $cmd 2>&1
    
    $exitCode = $LASTEXITCODE
    $duration = (Get-Date) - $startTime
    
    Pop-Location
    
    Write-Header "Test Execution Complete"
    
    if ($exitCode -eq 0) {
        Write-Host "All tests passed!" -ForegroundColor Green
        Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Gray
        exit 0
    }
    else {
        Write-Host "Some tests failed (Exit code: $exitCode)" -ForegroundColor Red
        Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Gray
        exit $exitCode
    }
}
catch {
    Write-Host "Test execution failed: $_" -ForegroundColor Red
    exit 1
}
