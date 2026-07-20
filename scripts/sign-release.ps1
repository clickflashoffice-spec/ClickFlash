param(
    [Parameter(Mandatory=$true)]
    [string]$TargetDirectory,
    [string]$CertPath = "",
    [string]$CertPassword = $env:CERT_PASSWORD
)

$ErrorActionPreference = "Stop"

Write-Host "============================================"
Write-Host "  Authenticode Code Signing Pipeline"
Write-Host "============================================"
Write-Host "Target Directory: $TargetDirectory"

if (-not (Test-Path $TargetDirectory)) {
    Write-Host "Error: Target directory does not exist." -ForegroundColor Red
    exit 1
}

# Find all executables and DLLs in the target directory (recursively)
$filesToSign = Get-ChildItem -Path $TargetDirectory -Include *.exe, *.dll -Recurse

if ($filesToSign.Count -eq 0) {
    Write-Host "No .exe or .dll files found to sign." -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($filesToSign.Count) files to sign."

$cert = $null

if ($CertPath -ne "" -and (Test-Path $CertPath)) {
    Write-Host "Loading certificate from $CertPath..."
    $securePassword = ConvertTo-SecureString -String $CertPassword -AsPlainText -Force
    $cert = Get-PfxCertificate -FilePath $CertPath
} else {
    Write-Host "No certificate path provided or file not found. We will attempt to find a valid code signing certificate in the user's certificate store..." -ForegroundColor Yellow
    $cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Select-Object -First 1
    if (-not $cert) {
        Write-Host "No valid code signing certificate found in Cert:\CurrentUser\My." -ForegroundColor Red
        Write-Host "Note: In a real CI environment, ensure you supply a valid CertPath or have one installed." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Found certificate: $($cert.Subject)"
}

$timestampServer = "http://timestamp.digicert.com"

$failureCount = 0

foreach ($file in $filesToSign) {
    Write-Host "Signing: $($file.Name)..." -NoNewline

    try {
        if ($CertPath -ne "") {
            # Use signtool if we have a PFX and password (easier to pass password directly)
            # Find signtool.exe
            $signtool = (Get-ChildItem -Path "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe" | Sort-Object FullName -Descending | Select-Object -First 1).FullName
            if ($signtool) {
                & $signtool sign /f $CertPath /p $CertPassword /tr $timestampServer /td sha256 /fd sha256 $file.FullName | Out-Null
            } else {
                Write-Host " [Failed - signtool.exe not found]" -ForegroundColor Red
                $failureCount++
                continue
            }
        } else {
            Set-AuthenticodeSignature -FilePath $file.FullName -Certificate $cert -TimestampServer $timestampServer | Out-Null
        }
        
        # Verify signature
        $sig = Get-AuthenticodeSignature -FilePath $file.FullName
        if ($sig.Status -eq 'Valid') {
            Write-Host " [Success]" -ForegroundColor Green
        } else {
            Write-Host " [Failed - Invalid Signature: $($sig.StatusMessage)]" -ForegroundColor Red
            $failureCount++
        }
    } catch {
        Write-Host " [Error: $_]" -ForegroundColor Red
        $failureCount++
    }
}

Write-Host ""
if ($failureCount -gt 0) {
    Write-Host "Code signing failed for $failureCount files." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All files successfully signed and verified!" -ForegroundColor Green
    exit 0
}
