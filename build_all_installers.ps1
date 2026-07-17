Write-Host "Building Installer..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\installer
pnpm run package:installer
if ($LASTEXITCODE -ne 0) { throw "Installer build failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v3.0\03_Production_Builds\ClickFlash_Studio_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building Master..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\master
pnpm run package:installer
if ($LASTEXITCODE -ne 0) { throw "Master build failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v3.0\03_Production_Builds\ClickFlash_Master_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building Touch..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\touch
pnpm run dist
if ($LASTEXITCODE -ne 0) { throw "Touch build failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v3.0\03_Production_Builds\ClickFlash_Touch_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building License Generator..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\license-generator
pnpm run package:win
if ($LASTEXITCODE -ne 0) { throw "License Generator build failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v3.0\03_Production_Builds\ClickFlash_License_Generator_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Builds completed successfully!"
