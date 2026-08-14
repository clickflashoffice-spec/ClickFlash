#!/usr/bin/env pwsh
<#
.SYNOPSIS
    R2 Upload E2E Test using Cloudflare Wrangler CLI
    
.DESCRIPTION
    Tests MoneyTrash -> Cloudflare R2 upload pipeline using wrangler CLI
    
.PARAMETER SiteId
    Site ID to test (TN001, TN002, TN003, or "all")
    
.PARAMETER Remote
    Use --remote flag to test against production R2 (default: local)
#>

param(
    [Parameter(Position = 0)]
    [string]$SiteId = "TN001",
    
    [switch]$Remote
)

$ErrorActionPreference = "Stop"

# Configuration
$BUCKET = "clickflash-assets"
$SITES = @{
    "TN001" = @{ Name = "Hotel Tunisia 1"; Location = "Tunis" }
    "TN002" = @{ Name = "Hotel Tunisia 2"; Location = "Hammamet" }
    "TN003" = @{ Name = "Hotel Tunisia 3"; Location = "Sousse" }
}

$script:Results = @()
$script:TestFiles = @()
$script:UploadedKeys = @{}

function Write-Header($text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-TestResult($name, $success, $details, $duration) {
    $icon = if ($success) { "[PASS]" } else { "[FAIL]" }
    $color = if ($success) { "Green" } else { "Red" }
    Write-Host "$icon $name" -ForegroundColor $color
    Write-Host "   $details" -ForegroundColor Gray
    if ($duration) {
        Write-Host "   Duration: ${duration}ms" -ForegroundColor Gray
    }
    Write-Host ""
}

function Test-R2Configuration {
    $start = Get-Date
    try {
        $bucketList = npx wrangler r2 bucket list 2>&1
        $hasBucket = $bucketList -match $BUCKET
        
        $result = @{
            Success = $hasBucket
            SiteId = $SiteId
            Operation = "R2 Configuration"
            Details = if ($hasBucket) { "Bucket '$BUCKET' found" } else { "Bucket '$BUCKET' not found" }
            Duration = ((Get-Date) - $start).TotalMilliseconds
        }
        
        Write-TestResult "R2 Configuration" $result.Success $result.Details $result.Duration
        return $result
    }
    catch {
        $result = @{
            Success = $false
            SiteId = $SiteId
            Operation = "R2 Configuration"
            Details = "Failed to list buckets"
            Duration = ((Get-Date) - $start).TotalMilliseconds
            Error = $_.Exception.Message
        }
        Write-TestResult "R2 Configuration" $false $result.Error $result.Duration
        return $result
    }
}

function Test-UploadToSiteFolder($site) {
    $start = Get-Date
    $testFile = "test-r2-$site-$(Get-Random).txt"
    $key = "$site/test/$testFile"
    $localPath = "$env:TEMP\$testFile"
    
    try {
        # Create test file
        $content = @"
R2 E2E Test Upload - $site
Timestamp: $(Get-Date -Format "o")
Site: $site
Site Name: $($SITES[$site].Name)
Location: $($SITES[$site].Location)
Test: MoneyTrash Cloud Upload
"@
        $content | Out-File -FilePath $localPath -Encoding utf8
        
        $script:TestFiles += $localPath
        
        # Upload using wrangler
        $remoteFlag = if ($Remote) { "" } else { "--local" }
        $cmd = "npx wrangler r2 object put `"$BUCKET/$key`" --file=`"$localPath`" --content-type=`"text/plain`" $remoteFlag"
        $output = Invoke-Expression $cmd 2>&1
        
        $success = $output -match "Upload complete"
        
        $result = @{
            Success = $success
            SiteId = $site
            Operation = "Upload to Site Folder"
            Details = "Key: $key"
            Duration = ((Get-Date) - $start).TotalMilliseconds
        }
        
        if ($success) {
            $script:UploadedKeys[$site] = $key
        }
        Write-TestResult "Upload to Site Folder ($site)" $success $result.Details $result.Duration
        return $result
    }
    catch {
        $result = @{
            Success = $false
            SiteId = $site
            Operation = "Upload to Site Folder"
            Details = "Key: $key"
            Duration = ((Get-Date) - $start).TotalMilliseconds
            Error = $_.Exception.Message
        }
        Write-TestResult "Upload to Site Folder ($site)" $false $_.Exception.Message $result.Duration
        return $result
    }
}

function Test-UploadImageFile($site) {
    $start = Get-Date
    $testFile = "test-image-$site-$(Get-Random).jpg"
    $key = "$site/test/$testFile"
    $localPath = "$env:TEMP\$testFile"
    
    try {
        # Create a minimal JPEG file (valid JPEG header)
        $jpegBytes = [byte[]]@(0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 
                              0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9)
        [System.IO.File]::WriteAllBytes($localPath, $jpegBytes)
        
        $script:TestFiles += $localPath
        
        # Upload using wrangler with JPEG content type
        $remoteFlag = if ($Remote) { "" } else { "--local" }
        $cmd = "npx wrangler r2 object put `"$BUCKET/$key`" --file=`"$localPath`" --content-type=`"image/jpeg`" $remoteFlag"
        $output = Invoke-Expression $cmd 2>&1
        
        $success = $output -match "Upload complete"
        
        $result = @{
            Success = $success
            SiteId = $site
            Operation = "Upload JPEG Image"
            Details = "Key: $key, Content-Type: image/jpeg"
            Duration = ((Get-Date) - $start).TotalMilliseconds
        }
        
        Write-TestResult "Upload JPEG Image ($site)" $success $result.Details $result.Duration
        return $result
    }
    catch {
        $result = @{
            Success = $false
            SiteId = $site
            Operation = "Upload JPEG Image"
            Details = "Key: $key"
            Duration = ((Get-Date) - $start).TotalMilliseconds
            Error = $_.Exception.Message
        }
        Write-TestResult "Upload JPEG Image ($site)" $false $_.Exception.Message $result.Duration
        return $result
    }
}

function Test-DownloadFile($site, $specificKey) {
    $start = Get-Date
    $key = if ($specificKey) { $specificKey } else { "$site/test/e2e-test.txt" }
    $localPath = "$env:TEMP\r2-download-$site-$(Get-Random).txt"
    
    try {
        $remoteFlag = if ($Remote) { "" } else { "--local" }
        $cmd = "npx wrangler r2 object get `"$BUCKET/$key`" --file=`"$localPath`" $remoteFlag"
        $output = Invoke-Expression $cmd 2>&1
        
        $success = (Test-Path $localPath) -and ((Get-Item $localPath).Length -gt 0)
        
        $result = @{
            Success = $success
            SiteId = $site
            Operation = "Download File"
            Details = "Key: $key, Size: $((Get-Item $localPath).Length) bytes"
            Duration = ((Get-Date) - $start).TotalMilliseconds
        }
        
        if ($success) {
            $script:TestFiles += $localPath
        }
        
        Write-TestResult "Download File ($site)" $success $result.Details $result.Duration
        return $result
    }
    catch {
        $result = @{
            Success = $false
            SiteId = $site
            Operation = "Download File"
            Details = "Key: $key"
            Duration = ((Get-Date) - $start).TotalMilliseconds
            Error = $_.Exception.Message
        }
        Write-TestResult "Download File ($site)" $false "Download failed (file may not exist)" $result.Duration
        return $result
    }
}

function Test-DeleteFile($site) {
    $start = Get-Date
    $key = "$site/test/delete-test-$(Get-Random).txt"
    $localPath = "$env:TEMP\delete-test-$site.txt"
    
    try {
        # Create and upload a file first
        "Delete test file" | Out-File -FilePath $localPath -Encoding utf8
        
        $remoteFlag = if ($Remote) { "" } else { "--local" }
        $cmd = "npx wrangler r2 object put `"$BUCKET/$key`" --file=`"$localPath`" --content-type=`"text/plain`" $remoteFlag"
        Invoke-Expression $cmd 2>&1 | Out-Null
        
        # Now delete it
        $cmd = "npx wrangler r2 object delete `"$BUCKET/$key`" $remoteFlag"
        $output = Invoke-Expression $cmd 2>&1
        
        $result = @{
            Success = $true
            SiteId = $site
            Operation = "Delete File"
            Details = "Key: $key deleted"
            Duration = ((Get-Date) - $start).TotalMilliseconds
        }
        
        Write-TestResult "Delete File ($site)" $true $result.Details $result.Duration
        return $result
    }
    catch {
        $result = @{
            Success = $false
            SiteId = $site
            Operation = "Delete File"
            Details = "Key: $key"
            Duration = ((Get-Date) - $start).TotalMilliseconds
            Error = $_.Exception.Message
        }
        Write-TestResult "Delete File ($site)" $false $_.Exception.Message $result.Duration
        return $result
    }
}

# Main Execution
Write-Header "R2 Upload E2E Tests - Using Wrangler CLI"

$mode = if ($Remote) { "REMOTE (Production)" } else { "LOCAL (Development)" }
Write-Host "Mode: $mode" -ForegroundColor Yellow
Write-Host "Bucket: $BUCKET" -ForegroundColor Yellow
Write-Host ""

# Determine sites to test
$sitesToTest = if ($SiteId -eq "all") { @("TN001", "TN002", "TN003") } else { @($SiteId) }

# Run configuration test
$script:Results += Test-R2Configuration

# Run tests for each site
foreach ($site in $sitesToTest) {
    if (-not $SITES.ContainsKey($site)) {
        Write-Host "[FAIL] Unknown site: $site" -ForegroundColor Red
        continue
    }
    
    Write-Host ""
    Write-Host "--- Testing Site: $site ($($SITES[$site].Name)) ---" -ForegroundColor Magenta
    Write-Host ""
    
    $script:Results += Test-UploadToSiteFolder $site
    $script:Results += Test-UploadImageFile $site
    $uploadedKey = $script:UploadedKeys[$site]
    $script:Results += Test-DownloadFile $site $uploadedKey
    $script:Results += Test-DeleteFile $site
}

# Cleanup
Write-Host ""
Write-Host "--- Cleanup ---" -ForegroundColor Yellow
foreach ($file in $script:TestFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "[CLEANUP] Removed: $file" -ForegroundColor Gray
    }
}

# Print Results Summary
Write-Header "TEST RESULTS SUMMARY"

$passed = ($script:Results | Where-Object { $_.Success }).Count
$failed = ($script:Results | Where-Object { -not $_.Success }).Count

Write-Host "Total: $($script:Results.Count) | Passed: $passed | Failed: $failed"
Write-Host ""

# Detailed results
foreach ($result in $script:Results) {
    $icon = if ($result.Success) { "[PASS]" } else { "[FAIL]" }
    $color = if ($result.Success) { "Green" } else { "Red" }
    Write-Host "$icon $($result.Operation) [$($result.SiteId)]" -ForegroundColor $color
    Write-Host "   $($result.Details)" -ForegroundColor Gray
    if ($result.Error) {
        Write-Host "   Error: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($failed -gt 0) {
    exit 1
}
