# Touch Backend Scripts

This directory contains maintenance and utility scripts for the Touch Kiosk application.

## Usage

These scripts are designed to be run from this directory but will execute commands relative to the project root.

- **start-touch.bat**: Starts the application in development mode (separate windows for frontend/backend).
- **start_touch_unified.bat**: Starts the application in production mode.
- **install.bat**: Installs dependencies and sets up the environment.
- **setup-network-shares.ps1**: PowerShell script to share folders for Master Portal access.
- **deploy.sh**: Deployment helper script.
- **clean-install.bat**: Nukes `node_modules` and reinstalls.
