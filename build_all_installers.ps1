$env:CLICKFLASH_LICENSE_PUBLIC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
$env:NODE_ENV = "development"
$env:SKIP_SIGNING = "true"
$env:ESBUILD_BINARY_PATH = "C:\Users\alamo\Desktop\ClickFlash\node_modules\.pnpm\@esbuild+win32-x64@0.25.12\node_modules\@esbuild\win32-x64\esbuild.exe"

$outputDir = "C:\Users\alamo\Desktop\ClickFlash_Release_v2.0\03_Production_Builds"
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Force -Path $outputDir }

Write-Host "=========================================="
Write-Host "1/4 Building ClickFlash Studio Setup..."
Write-Host "=========================================="
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
$instExe = Get-ChildItem "release" -Filter "ClickFlash*.exe" | Where-Object { $_.Name -notlike "*uninstaller*" } | Select-Object -First 1
if ($instExe) {
    Copy-Item $instExe.FullName -Destination "$outputDir\ClickFlash_Studio_Setup.exe" -Force
    Write-Host "Copied $($instExe.Name) -> $outputDir\ClickFlash_Studio_Setup.exe"
}

Write-Host "=========================================="
Write-Host "2/4 Building ClickFlash Master OS..."
Write-Host "=========================================="
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
$masterExe = Get-ChildItem "release" -Filter "ClickFlash*.exe" | Where-Object { $_.Name -notlike "*uninstaller*" } | Select-Object -First 1
if ($masterExe) {
    Copy-Item $masterExe.FullName -Destination "$outputDir\ClickFlash_Master_Setup.exe" -Force
    Write-Host "Copied $($masterExe.Name) -> $outputDir\ClickFlash_Master_Setup.exe"
}

Write-Host "=========================================="
Write-Host "3/4 Building ClickFlash Touch Kiosk..."
Write-Host "=========================================="
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
$touchExe = Get-ChildItem "release" -Filter "ClickFlash*.exe" | Where-Object { $_.Name -notlike "*uninstaller*" } | Select-Object -First 1
if ($touchExe) {
    Copy-Item $touchExe.FullName -Destination "$outputDir\ClickFlash_Touch_Setup.exe" -Force
    Write-Host "Copied $($touchExe.Name) -> $outputDir\ClickFlash_Touch_Setup.exe"
}

Write-Host "=========================================="
Write-Host "4/4 Building ClickFlash License Generator..."
Write-Host "=========================================="
cd C:\Users\alamo\Desktop\ClickFlash\apps\license-generator
pnpm run build:renderer
if ($LASTEXITCODE -ne 0) { throw "License Generator build:renderer failed" }
pnpm run build:electron
if ($LASTEXITCODE -ne 0) { throw "License Generator build:electron failed" }
pnpm exec rimraf release/win-unpacked
pnpm exec electron-builder build --win
if ($LASTEXITCODE -ne 0) { throw "License Generator package failed" }
$licenseExe = Get-ChildItem "release" -Filter "ClickFlash*.exe" | Where-Object { $_.Name -notlike "*uninstaller*" } | Select-Object -First 1
if ($licenseExe) {
    Copy-Item $licenseExe.FullName -Destination "$outputDir\ClickFlash_License_Generator_Setup.exe" -Force
    Write-Host "Copied $($licenseExe.Name) -> $outputDir\ClickFlash_License_Generator_Setup.exe"
}

Write-Host "=========================================="
Write-Host "🎉 All Production Installers Built Successfully!"
Write-Host "Output Directory: $outputDir"
Get-ChildItem $outputDir -Filter "*.exe" | Format-Table Name, Length, LastWriteTime
Write-Host "=========================================="
