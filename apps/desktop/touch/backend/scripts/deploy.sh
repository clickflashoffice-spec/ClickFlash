#!/bin/bash
# Touch App Deployment Script

# Change to project root (2 levels up from backend/scripts)
cd "$(dirname "$0")/../.."

echo "🚀 Deploying Touch Kiosk App..."

# Configuration
APP_NAME="star-master-touch"
BUILD_DIR="dist/touch"
DEPLOY_DIR="/var/www/touch"  # Adjust for your server

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Step 2: Build application
echo "🔨 Building application..."
npm run build

# Check if build succeeded
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Step 3: Backup existing deployment (if exists)
if [ -d "$DEPLOY_DIR" ]; then
    echo "💾 Backing up existing deployment..."
    BACKUP_DIR="${DEPLOY_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    mv "$DEPLOY_DIR" "$BACKUP_DIR"
    echo "✅ Backup created: $BACKUP_DIR"
fi

# Step 4: Deploy new build
echo "📤 Deploying to $DEPLOY_DIR..."
mkdir -p "$DEPLOY_DIR"
cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"

# Step 5: Set permissions
echo "🔐 Setting permissions..."
chmod -R 755 "$DEPLOY_DIR"

# Step 6: Verify deployment
if [ -f "$DEPLOY_DIR/index.html" ]; then
    echo "✅ Deployment successful!"
    echo "📍 Deployed to: $DEPLOY_DIR"
else
    echo "❌ Deployment verification failed"
    exit 1
fi

# Step 7: Configure kiosk mode (if on kiosk device)
# echo "🖥️ Configuring kiosk mode..."
# sudo systemctl enable kiosk-mode

echo "🎉 Touch App deployment complete!"
