#!/bin/bash

# MoneyTrash Cloudflare Worker Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
echo "Deploying MoneyTrash API to Cloudflare ($ENVIRONMENT)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler is not installed${NC}"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Cloudflare. Please authenticate...${NC}"
    wrangler login
fi

echo -e "${GREEN}✓ Authenticated with Cloudflare${NC}"

# Deploy based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Deploying to PRODUCTION..."
    wrangler deploy --env production
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "Deploying to STAGING..."
    wrangler deploy --env staging
else
    echo "Deploying to default environment..."
    wrangler deploy
fi

echo -e "${GREEN}✓ Deployment complete!${NC}"

# Show deployment info
echo ""
echo "Deployment Info:"
wrangler deployment list | head -5

# Run health check
echo ""
echo "Running health check..."
WORKER_URL=$(wrangler deployment list | grep -o 'https://[^ ]*' | head -1)
if [ -n "$WORKER_URL" ]; then
    curl -s "$WORKER_URL/api/health" | jq .
fi

echo -e "${GREEN}✓ All done!${NC}"
