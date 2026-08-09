Write-Host "Building Installer..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\installer
pnpm run prepare:license-trust
if ($LASTEXITCODE -ne 0) { throw "Installer prepare failed" }
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Installer build failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "Installer build:electron failed" }
npx rimraf release/win-unpacked
npx electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "Installer package failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v2.0\03_Production_Builds\ClickFlash_Studio_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building Master..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\master
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Master build failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "Master build:electron failed" }
npx rimraf release/win-unpacked
npx electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "Master package failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v2.0\03_Production_Builds\ClickFlash_Master_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building Touch..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\touch
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Touch build failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "Touch build:electron failed" }
npx rimraf release/win-unpacked
npx electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "Touch package failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v2.0\03_Production_Builds\ClickFlash_Touch_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building License Generator..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\license-generator
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "License Generator build failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "License Generator build:electron failed" }
npx rimraf release/win-unpacked
npx electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "License Generator package failed" }
Copy-Item "release\*.exe" -Destination "C:\Users\alamo\Desktop\ClickFlash_Release_v2.0\03_Production_Builds\ClickFlash_License_Generator_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Builds completed successfully!"
