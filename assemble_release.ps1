$ErrorActionPreference = "Stop"

$releaseDir = "C:\Users\alamo\Desktop\ClickFlash\ClickFlash_Release_v2.0"
$zipPath = "C:\Users\alamo\Desktop\ClickFlash\ClickFlash_v2.0.0-production.zip"

Write-Host "Copying Installer..."
Copy-Item -Path "apps\installer\release\ClickFlash-Studio-Setup-*.exe" -Destination "$releaseDir\01_Installer" -Force -ErrorAction SilentlyContinue

Write-Host "Copying Master and Touch..."
Copy-Item -Path "apps\master\release\ClickFlash Master OS Setup *.exe" -Destination "$releaseDir\02_Master_and_Touch" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "apps\touch\release\ClickFlash - Touch Kiosk Setup *.exe" -Destination "$releaseDir\02_Master_and_Touch" -Force -ErrorAction SilentlyContinue

Write-Host "Copying License Generator..."
Copy-Item -Path "apps\license-generator\release\ClickFlash License Generator Setup *.exe" -Destination "$releaseDir\03_License_and_MoneyTrash" -Force -ErrorAction SilentlyContinue

Write-Host "Copying MoneyTrash..."
Copy-Item -Path "apps\moneytrash\src-tauri\target\release\bundle\msi\*.msi" -Destination "$releaseDir\03_License_and_MoneyTrash" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "apps\moneytrash\src-tauri\target\release\bundle\nsis\*.exe" -Destination "$releaseDir\03_License_and_MoneyTrash" -Force -ErrorAction SilentlyContinue

Write-Host "Copying Assets and Configs..."
if (Test-Path "apps\master\backend\.env.example") {
    Copy-Item -Path "apps\master\backend\.env.example" -Destination "$releaseDir\04_Assets_and_Config" -Force
}
$schemaFile = Get-ChildItem -Path . -Recurse -Filter schema.sql | Select-Object -First 1
if ($schemaFile) {
    Copy-Item -Path $schemaFile.FullName -Destination "$releaseDir\04_Assets_and_Config" -Force
}

Write-Host "Generating Manuals placeholder..."
Set-Content -Path "$releaseDir\05_Manuals\README.md" -Value "# ClickFlash v2.0.0 - User Manual`n`nDetails to be filled." -Force

Write-Host "Creating Zip Archive..."
if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force }
Compress-Archive -Path "$releaseDir\*" -DestinationPath $zipPath

Write-Host "Assembly and zipping complete!"
