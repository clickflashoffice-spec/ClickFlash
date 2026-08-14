# ClickFlash Master OS Configuration Script
# Run automatically after NSIS installation

$ErrorActionPreference = "Stop"

# Port Configuration
$TCP_PORTS = @(8090, 8091) # Master and Touch
$UDP_PORTS = @(8090, 8091)

# Firewall Rules
Write-Host "Configuring Windows Firewall..."
foreach ($port in $TCP_PORTS) {
    $ruleName = "ClickFlash TCP Port $port"
    $ruleExists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (!$ruleExists) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -Profile Any | Out-Null
        Write-Host "Added rule: $ruleName"
    } else {
        Write-Host "Rule already exists: $ruleName"
    }
}

foreach ($port in $UDP_PORTS) {
    $ruleName = "ClickFlash UDP Port $port"
    $ruleExists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (!$ruleExists) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol UDP -Action Allow -Profile Any | Out-Null
        Write-Host "Added rule: $ruleName"
    } else {
        Write-Host "Rule already exists: $ruleName"
    }
}

# Auto-start with Windows (Optional)
# $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
# Set-ItemProperty -Path $regPath -Name "ClickFlashMaster" -Value "`"$env:LOCALAPPDATA\Programs\clickflash-master\ClickFlash Master OS.exe`""

Write-Host "Master node successfully configured!"
