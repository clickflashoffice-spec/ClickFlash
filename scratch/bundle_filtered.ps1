$outputFile = "C:\Users\alamo\Desktop\ClickFlash\ClickFlash-Codebase-Filtered.txt"
if (Test-Path $outputFile) { Remove-Item $outputFile }

$includeDirs = @("apps", "packages", "docs", "TunnelManager", "workers", "scripts", "tools")
$includeRootFiles = @("README.md", "AGENTS.md", "CLAUDE.md", "context.md")
$extensions = @(".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".html", ".css")

Get-ChildItem -Path "C:\Users\alamo\Desktop\ClickFlash" -Recurse | Where-Object {
    $item = $_
    if ($item.PSIsContainer) { return $false }
    if ($item.Length -gt 500000) { return $false } # Skip very large files
    
    $relativePath = $item.FullName.Substring("C:\Users\alamo\Desktop\ClickFlash\".Length)
    $pathParts = $relativePath.Split('\')
    
    $isIncluded = $false
    # Include root files
    if ($pathParts.Length -eq 1 -and $includeRootFiles -contains $item.Name) {
        $isIncluded = $true
    } 
    # Include specific directories
    elseif ($pathParts.Length -gt 1 -and $includeDirs -contains $pathParts[0]) {
        $extMatches = $false
        foreach ($ext in $extensions) { if ($item.Extension -eq $ext) { $extMatches = $true; break } }
        if ($extMatches) { $isIncluded = $true }
        
        # Filter out tests and storybook files
        if ($relativePath -match "\\tests?\\" -or $relativePath -match "\\__tests__\\" -or $relativePath -match "\.test\." -or $relativePath -match "\.spec\.") {
            $isIncluded = $false
        }
    }
    
    return $isIncluded
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
