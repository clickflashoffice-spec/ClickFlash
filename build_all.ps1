$ErrorActionPreference = "Stop"
$ReleaseDir = "C:\Users\alamo\Desktop\ClickFlash_Release_v3.0\03_Production_Builds"

Write-Host "Building Master App..."
Set-Location "C:\Users\alamo\Desktop\ClickFlash\apps\master"
npm run package:installer
Copy-Item "release\*.exe" -Destination "$ReleaseDir\ClickFlash_Master_v3.0.0_Setup.exe" -Force -ErrorAction SilentlyContinue

Write-Host "Building Touch App..."
Set-Location "C:\Users\alamo\Desktop\ClickFlash\apps\touch"
npm run dist
Copy-Item "release\*.exe" -Destination "$ReleaseDir\ClickFlash_Touch_v3.0.0_Setup.exe" -Force -ErrorAction SilentlyContinue

Write-Host "Building Installer App..."
Set-Location "C:\Users\alamo\Desktop\ClickFlash\apps\installer"
npm run package:installer
Copy-Item "..\..\ClickFlash_Release_v3.0\03_Production_Builds\*.exe" -Destination "$ReleaseDir\ClickFlash_Installer_v3.0.0.exe" -Force -ErrorAction SilentlyContinue

Write-Host "Building License Generator App..."
Set-Location "C:\Users\alamo\Desktop\ClickFlash\apps\license-generator"
npm run package:win
Copy-Item "release\*.exe" -Destination "$ReleaseDir\ClickFlash_License_Gen_v3.0.0.exe" -Force -ErrorAction SilentlyContinue

Write-Host "Build and Copy Complete!"
