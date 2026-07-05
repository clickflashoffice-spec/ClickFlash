#!/bin/bash
# ClickFlash Ecosystem — Manual Deployment Script
# Usage: ./deploy.sh [app|all]
# Examples:
#   ./deploy.sh gallery     # Deploy only Gallery Worker
#   ./deploy.sh all         # Deploy all 4 web apps

set -euo pipefail

APP=${1:-all}
CLOUDFLARE_ACCOUNT_ID="<REDACTED:CF_ACCOUNT_ID>"

echo "🚀 ClickFlash Ecosystem Deployment"
echo "=================================="
echo "Target: $APP"
echo "Account: $CLOUDFLARE_ACCOUNT_ID"
echo ""

deploy_gallery() {
  echo "📸 Deploying Gallery Worker..."
  cd apps/gallery/backend
  npx wrangler deploy
  echo "✅ Gallery deployed: https://gallery-backend.clickflash-office.workers.dev"
  cd ../../..
}

deploy_moneytrash() {
  echo "💰 Deploying MoneyTrash Worker..."
  cd apps/moneytrash/cloudflare
  npx wrangler deploy
  echo "✅ MoneyTrash deployed: https://moneytrash-api.clickflash-office.workers.dev"
  cd ../../..
}

deploy_management() {
  echo "📊 Deploying Management Worker..."
  cd apps/management/backend
  npx wrangler deploy
  echo "✅ Management deployed: https://management-hub.clickflash-office.workers.dev"
  cd ../../..
}

deploy_website() {
  echo "🌐 Deploying Website Pages..."
  cd apps/website
  npm run build
  npx wrangler pages deploy out --commit-dirty=true
  echo "✅ Website deployed: https://clickflash-website.pages.dev"
  cd ../..
}

case "$APP" in
  gallery)
    deploy_gallery
    ;;
  moneytrash)
    deploy_moneytrash
    ;;
  management)
    deploy_management
    ;;
  website)
    deploy_website
    ;;
  all)
    deploy_gallery
    deploy_moneytrash
    deploy_management
    deploy_website
    echo ""
    echo "🎉 All 4 apps deployed successfully!"
    ;;
  *)
    echo "❌ Unknown app: $APP"
    echo "Usage: ./deploy.sh [gallery|moneytrash|management|website|all]"
    exit 1
    ;;
esac

echo ""
echo "📋 Deployment Summary"
echo "===================="
echo "Gallery Worker:    https://gallery-backend.clickflash-office.workers.dev"
echo "MoneyTrash Worker: https://moneytrash-api.clickflash-office.workers.dev"
echo "Management Worker: https://management-hub.clickflash-office.workers.dev"
echo "Website Pages:     https://clickflash-website.pages.dev"
echo ""
echo "🔍 Health Check URLs:"
echo "Gallery:    curl https://gallery-backend.clickflash-office.workers.dev/api/health"
echo "MoneyTrash: curl https://moneytrash-api.clickflash-office.workers.dev/api/health"
echo "Management: curl https://management-hub.clickflash-office.workers.dev/api/health"
echo "Website:    curl -I https://clickflash-website.pages.dev"
