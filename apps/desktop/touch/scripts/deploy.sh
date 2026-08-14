#!/bin/bash
# Touch App Deployment Script for Linux/Mac
# This script builds and deploys the Touch Kiosk application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_TARGET="${1:-local}"
REMOTE_HOST="${2:-}"
REMOTE_PATH="${3:-/var/www/html/touch}"

echo -e "${CYAN}========================================"
echo -e "  Touch App Deployment Script"
echo -e "========================================${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}[1/5] Cleaning previous builds...${NC}"
if [ -d "dist/touch" ]; then
    rm -rf dist/touch
    echo -e "${GREEN}✓ Cleaned dist/touch directory${NC}"
fi

# Step 2: Run TypeScript check
echo ""
echo -e "${YELLOW}[2/5] Running TypeScript check...${NC}"
if ! npx tsc --noEmit; then
    echo -e "${RED}✗ TypeScript errors found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ TypeScript check passed${NC}"

# Step 3: Build production bundle
echo ""
echo -e "${YELLOW}[3/5] Building production bundle...${NC}"
if ! npm run build; then
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Production build complete${NC}"

# Step 4: Create deployment package
echo ""
echo -e "${YELLOW}[4/5] Creating deployment package...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="touch-app-${TIMESTAMP}.tar.gz"

if [ -f "$PACKAGE_NAME" ]; then
    rm "$PACKAGE_NAME"
fi

tar -czf "$PACKAGE_NAME" -C dist/touch .
echo -e "${GREEN}✓ Created package: $PACKAGE_NAME${NC}"

# Step 5: Deploy based on target
echo ""
echo -e "${YELLOW}[5/5] Deploying to $DEPLOY_TARGET...${NC}"

case "$DEPLOY_TARGET" in
    local)
        echo -e "${CYAN}Local deployment - files are in dist/touch/${NC}"
        echo -e "${CYAN}You can serve them with: npm run preview${NC}"
        ;;
    remote)
        if [ -z "$REMOTE_HOST" ]; then
            echo -e "${RED}✗ Remote host not specified! Usage: ./deploy.sh remote user@host [/path]${NC}"
            exit 1
        fi
        echo -e "${CYAN}Deploying to $REMOTE_HOST:$REMOTE_PATH...${NC}"
        ssh "$REMOTE_HOST" "mkdir -p $REMOTE_PATH"
        scp -r dist/touch/* "$REMOTE_HOST:$REMOTE_PATH/"
        echo -e "${GREEN}✓ Deployed to remote server${NC}"
        ;;
    docker)
        echo -e "${CYAN}Building Docker image...${NC}"
        docker build -t touch-app:latest -f Dockerfile .
        docker tag touch-app:latest touch-app:$TIMESTAMP
        echo -e "${GREEN}✓ Docker image built: touch-app:latest${NC}"
        ;;
    *)
        echo -e "${RED}✗ Unknown deployment target: $DEPLOY_TARGET${NC}"
        echo -e "${YELLOW}Valid targets: local, remote, docker${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}========================================"
echo -e "${GREEN}  Deployment Complete! 🚀"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Package: ${PACKAGE_NAME}"
echo -e "Build size: $(du -sh dist/touch | cut -f1)"
