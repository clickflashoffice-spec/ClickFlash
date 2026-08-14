@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo   MoneyTrash Uploader Desktop - Setup
echo ==========================================
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)
echo ✅ Node.js found
echo.

echo [2/4] Checking Rust...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Rust not found! Installing via rustup...
    echo Please install Rust from https://rustup.rs/
    exit /b 1
)
echo ✅ Rust found
echo.

echo [3/4] Installing Node dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install Node dependencies
    exit /b 1
)
echo ✅ Node dependencies installed
echo.

echo [4/4] Installing Tauri CLI...
cargo install tauri-cli --locked
if errorlevel 1 (
    echo ⚠️  Failed to install Tauri CLI globally, trying npx...
)
echo ✅ Setup complete!
echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo   1. Run 'npm run tauri:dev' to start development
echo   2. Run 'npm run tauri:build' to build for production
echo.
pause
