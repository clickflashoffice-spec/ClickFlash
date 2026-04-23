# Start-All.ps1 - Hybrid Test Environment Launcher

Write-Host "🚀 Starting ClickFlash Hybrid Test Environment..." -ForegroundColor Cyan

# 1. Start Docker Containers (Cloud Layer)
Write-Host "☁️  Starting Cloud Layer (Docker)..." -ForegroundColor Yellow
Set-Location ".\web"
docker-compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Compose failed!" -ForegroundColor Red
    exit
}
Set-Location ".."

# 2. Start Master App (Local Layer)
Write-Host "🖥️  Starting Master App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'master-app/react-new-backup'; npm run dev:full"

# 3. Start Touch App (Local Layer)
Write-Host "👆 Starting Touch App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'touch-app/react'; npm run dev:full"

Write-Host "✅ All systems initiated!" -ForegroundColor Green
Write-Host "   - Management App: http://localhost:8092"
Write-Host "   - Unified Gallery: http://localhost:8093"
Write-Host "   - Master/Touch running in separate windows."
