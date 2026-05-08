$exePath = "C:\Users\alamo\Desktop\ClickFlash\apps\master\release\win-unpacked\ClickFlash Master OS.exe"

Write-Host "=== Testing ClickFlash Master OS ===" -ForegroundColor Cyan

# Kill any existing instances
Get-Process -Name "ClickFlash*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Just launch without args
Write-Host "Launching..." -ForegroundColor Yellow
$proc = Start-Process -FilePath $exePath -PassThru
Write-Host "Process started with ID: $($proc.Id)"

# Wait a bit
Start-Sleep -Seconds 3

# Check if still running
$running = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "[PASS] App running - Memory: $([math]::Round($running.WorkingSet64/1MB))MB" -ForegroundColor Green
    
    # Wait more for backend
    Start-Sleep -Seconds 10
    $portCheck = Get-NetTCPConnection -LocalPort 8090 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "[PASS] Port 8090 listening" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Port 8090 not listening yet" -ForegroundColor Yellow
    }
    
    # Cleanup
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "[FAIL] App exited" -ForegroundColor Red
    
    # Check for crashpad reports
    $crashPaths = @(
        "$env:APPDATA\ClickFlash Master OS\Crashpad\reports",
        "$env:LOCALAPPDATA\ClickFlash Master OS\Crashpad\reports"
    )
    
    foreach ($crashPath in $crashPaths) {
        if (Test-Path $crashPath) {
            Write-Host "`nCrash reports in: $crashPath" -ForegroundColor Red
            Get-ChildItem $crashPath -File -ErrorAction SilentlyContinue | Select-Object Name, Length, LastWriteTime
        }
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
