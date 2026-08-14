#!/bin/bash
set -e

echo "Deploying License Generator to secure internal instance..."

# Assume deployment to an isolated AWS EC2 or internal Raspberry Pi
TARGET_HOST="internal-license-gen.local"
TARGET_USER="admin"
TARGET_DIR="/opt/clickflash/license-generator"

# Build the node app
echo "Building package..."
npm run build

# Sync files
echo "Syncing to $TARGET_HOST..."
rsync -avz --exclude 'node_modules' --exclude '.env' ./dist/ $TARGET_USER@$TARGET_HOST:$TARGET_DIR

# Restart PM2 service
echo "Restarting service..."
ssh $TARGET_USER@$TARGET_HOST "cd $TARGET_DIR && npm install --production && pm2 restart license-generator"

echo "License Generator Deployment Complete."
