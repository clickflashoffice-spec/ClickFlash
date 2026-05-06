#!/bin/bash

# MoneyTrash Cloudflare Setup Script
# Run once to create all required resources

set -e

echo "🚀 Setting up MoneyTrash Cloudflare infrastructure..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo -e "${GREEN}✓ Authenticated${NC}"

# 1. Create D1 Database
echo ""
echo -e "${BLUE}Creating D1 Database...${NC}"
if wrangler d1 list | grep -q "moneytrash-db"; then
    echo -e "${YELLOW}Database 'moneytrash-db' already exists${NC}"
else
    wrangler d1 create moneytrash-db
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Get database ID
DB_ID=$(wrangler d1 list | grep "moneytrash-db" | awk '{print $1}')
echo "Database ID: $DB_ID"

# Update wrangler.toml with database ID
sed -i "s/your-d1-database-id/$DB_ID/g" wrangler.toml

# 2. Create R2 Bucket
echo ""
echo -e "${BLUE}Creating R2 Bucket...${NC}"
if wrangler r2 bucket list | grep -q "moneytrash-uploads"; then
    echo -e "${YELLOW}Bucket 'moneytrash-uploads' already exists${NC}"
else
    wrangler r2 bucket create moneytrash-uploads
    echo -e "${GREEN}✓ Bucket created${NC}"
fi

# 3. Create KV Namespace
echo ""
echo -e "${BLUE}Creating KV Namespace...${NC}"
if wrangler kv:namespace list | grep -q "UPLOAD_SESSIONS"; then
    echo -e "${YELLOW}KV namespace 'UPLOAD_SESSIONS' already exists${NC}"
else
    wrangler kv:namespace create UPLOAD_SESSIONS
    echo -e "${GREEN}✓ KV namespace created${NC}"
fi

# Get KV ID
KV_ID=$(wrangler kv:namespace list | grep "UPLOAD_SESSIONS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "KV ID: $KV_ID"

# Update wrangler.toml with KV ID
sed -i "s/your-kv-namespace-id/$KV_ID/g" wrangler.toml

# 4. Apply database schema
echo ""
echo -e "${BLUE}Applying database schema...${NC}"
wrangler d1 execute moneytrash-db --file=schema/schema.sql --local
wrangler d1 execute moneytrash-db --file=schema/schema.sql --remote
echo -e "${GREEN}✓ Schema applied${NC}"

# 5. Set secrets
echo ""
echo -e "${BLUE}Setting secrets...${NC}"

echo -n "Enter JWT_SECRET (or press Enter to generate): "
read -s JWT_SECRET
echo ""
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated JWT_SECRET"
fi
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET

echo -n "Enter STRIPE_SECRET_KEY (or press Enter to skip): "
read -s STRIPE_KEY
echo ""
if [ -n "$STRIPE_KEY" ]; then
    echo "$STRIPE_KEY" | wrangler secret put STRIPE_SECRET_KEY
fi

echo -n "Enter WEBHOOK_SECRET (or press Enter to generate): "
read -s WEBHOOK_SECRET
echo ""
if [ -z "$WEBHOOK_SECRET" ]; then
    WEBHOOK_SECRET=$(openssl rand -base64 32)
    echo "Generated WEBHOOK_SECRET"
fi
echo "$WEBHOOK_SECRET" | wrangler secret put WEBHOOK_SECRET

echo -e "${GREEN}✓ Secrets set${NC}"

# 6. Deploy
echo ""
echo -e "${BLUE}Deploying worker...${NC}"
wrangler deploy
echo -e "${GREEN}✓ Worker deployed${NC}"

# 7. Health check
echo ""
echo -e "${BLUE}Running health check...${NC}"
WORKER_URL=$(wrangler deployment list | grep -o 'https://[^ ]*' | head -1)
if [ -n "$WORKER_URL" ]; then
    HEALTH=$(curl -s "$WORKER_URL/api/health")
    echo "Health response: $HEALTH"
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${RED}✗ Health check failed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure your MoneyTrash app with the API endpoint: $WORKER_URL"
echo "  2. Register your office: POST $WORKER_URL/api/office/register"
echo "  3. Start uploading!"
