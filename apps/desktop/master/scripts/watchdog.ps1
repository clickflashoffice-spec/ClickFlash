<#
.SYNOPSIS
Hardware Watchdog Guardian for ClickFlash Ecosystem
.DESCRIPTION
This script is designed to run via Windows Task Scheduler (e.g., every 5 minutes)
on the physical hardware in a hotel installation. It ensures that both the Master App
and Touch App processes are running. If a process crashes or is unresponsive, the watchdog
will restart it and log the event.
#>

$LogFile = "C:\ClickFlash\watchdog.log"
$MasterPort = 8090
$TouchPort = 8091

function Log-Event {
    param([string]$Message)
    $TimeStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$TimeStamp] $Message"
    Write-Host "[$TimeStamp] $Message"
}

function Check-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        return $true
    }
    return $false
}

function Start-App {
    param([string]$AppName)
    if ($AppName -eq "Master") {
        Log-Event "Starting Master App..."
        # Example path, adjust to actual production build path
        Start-Process "C:\ClickFlash\Master\ClickFlashMaster.exe" -WindowStyle Hidden
    } elseif ($AppName -eq "Touch") {
        Log-Event "Starting Touch App..."
        # Example path, adjust to actual production build path
        Start-Process "C:\ClickFlash\Touch\ClickFlashTouch.exe" -WindowStyle Hidden
    }
}

Log-Event "Watchdog Check Started"

# Check Master
if (-not (Check-Port -Port $MasterPort)) {
    Log-Event "WARNING: Master App (Port $MasterPort) is not listening. Attempting restart."
    Start-App -AppName "Master"
} else {
    Log-Event "OK: Master App is running."
}

# Check Touch
if (-not (Check-Port -Port $TouchPort)) {
    Log-Event "WARNING: Touch App (Port $TouchPort) is not listening. Attempting restart."
    Start-App -AppName "Touch"
} else {
    Log-Event "OK: Touch App is running."
}

Log-Event "Watchdog Check Completed"
