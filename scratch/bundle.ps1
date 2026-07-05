$outputFile = "C:\Users\alamo\Desktop\ClickFlash\ClickFlash-Codebase.txt"
if (Test-Path $outputFile) { Remove-Item $outputFile }

$excludeDirs = @("node_modules", ".git", ".next", "dist", "build", "playwright-report", "test-results", "scratch", ".husky", ".turbo", "coverage")
$extensions = @(".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".json", ".yml", ".yaml", ".html", ".css")

Get-ChildItem -Path "C:\Users\alamo\Desktop\ClickFlash" -Recurse | Where-Object {
    $item = $_
    if ($item.PSIsContainer) { return $false }
    if ($item.Length -gt 500000) { return $false } # Skip very large files > 500KB
    if ($item.Name -match "lock") { return $false } # Skip lockfiles
    if ($item.Name -eq "ClickFlash-Codebase.txt") { return $false }
    
    $extMatches = $false
    foreach ($ext in $extensions) { if ($item.Extension -eq $ext) { $extMatches = $true; break } }
    if (-not $extMatches) { return $false }
    
    foreach ($dir in $excludeDirs) {
        if ($item.FullName -match "\\$dir\\") { return $false }
    }
    return $true
} | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        Add-Content -Path $outputFile -Value "================================================================================"
        Add-Content -Path $outputFile -Value "File: $($_.FullName.Replace('C:\Users\alamo\Desktop\ClickFlash\', ''))"
        Add-Content -Path $outputFile -Value "================================================================================"
        Add-Content -Path $outputFile -Value $content
        Add-Content -Path $outputFile -Value "`n"
    }
}
Write-Output "Codebase successfully bundled into $outputFile"
