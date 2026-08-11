$env:CLICKFLASH_LICENSE_PUBLIC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
$env:NODE_ENV = "development"

$outputDir = "C:\Users\alamo\Desktop\ClickFlash_Release_v2.0\03_Production_Builds"
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Force -Path $outputDir }

Write-Host "Building Installer..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\installer
pnpm run prepare:license-trust
if ($LASTEXITCODE -ne 0) { throw "Installer prepare failed" }
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Installer build failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "Installer build:electron failed" }
pnpm exec rimraf release/win-unpacked
pnpm exec electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "Installer package failed" }
Copy-Item "release\*.exe" -Destination "$outputDir\ClickFlash_Studio_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building Master..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\master
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Master build failed" }
pnpm run build:backend
if ($LASTEXITCODE -ne 0) { throw "Master build:backend failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "Master build:electron failed" }
pnpm exec rimraf release/win-unpacked
pnpm exec electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "Master package failed" }
Copy-Item "release\*.exe" -Destination "$outputDir\ClickFlash_Master_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building Touch..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\touch
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Touch build failed" }
pnpm run build:backend
if ($LASTEXITCODE -ne 0) { throw "Touch build:backend failed" }
pnpm run build:electron-ts
if ($LASTEXITCODE -ne 0) { throw "Touch build:electron-ts failed" }
pnpm exec rimraf release/win-unpacked
pnpm exec electron-builder build --config electron-builder.json --win
if ($LASTEXITCODE -ne 0) { throw "Touch package failed" }
Copy-Item "release\*.exe" -Destination "$outputDir\ClickFlash_Touch_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Building License Generator..."
cd C:\Users\alamo\Desktop\ClickFlash\apps\license-generator
pnpm run build:renderer
if ($LASTEXITCODE -ne 0) { throw "License Generator build:renderer failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "License Generator build:electron failed" }
pnpm exec rimraf release/win-unpacked
pnpm exec electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "License Generator package failed" }
Copy-Item "release\*.exe" -Destination "$outputDir\ClickFlash_License_Generator_Setup.exe" -ErrorAction SilentlyContinue

Write-Host "Builds completed successfully!"

