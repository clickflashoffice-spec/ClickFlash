#!/bin/bash
# ClickFlash 1-Click Installation Script
# Usage: ./install-clickflash.sh "Location Name" "admin@email.com" "password"

set -e

echo "========================================"
echo "  ClickFlash 1-Click Installation"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: install-clickflash.sh \"Location Name\" \"admin@email.com\" \"password\""
    echo ""
    echo "Example: install-clickflash.sh \"Miami Resort\" admin@example.com secret123"
    exit 1
fi

LOCATION="$1"
EMAIL="$2"
PASSWORD="$3"

if [ -z "$LOCATION" ]; then
    echo -e "${RED}Error: Location name is required${NC}"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: Email is required${NC}"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo -e "${RED}Error: Password is required${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 20.x first.${NC}"
    exit 1
fi

# Change to master directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/apps/master" 2>/dev/null || cd "$SCRIPT_DIR"

echo -e "${YELLOW}[1/3]${NC} Checking dependencies..."
npm install --legacy-peer-deps >/dev/null 2>&1 || true

echo -e "${YELLOW}[2/3]${NC} Running installation..."
echo ""
echo "Location: $LOCATION"
echo "Email: $EMAIL"
echo ""

npx tsx scripts/install-cli.ts --location "$LOCATION" --email "$EMAIL" --password "$PASSWORD" --port 8090

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "========================================"
    echo -e "  ${GREEN}Installation Successful!${NC}"
    echo "========================================"
    echo ""
    echo "To start ClickFlash:"
    echo "  npm run dev"
    echo ""
    echo "Access points:"
    echo "  Master Portal: http://localhost:8090"
    echo "  Frontend:      http://localhost:5173"
else
    echo "========================================"
    echo -e "  ${RED}Installation Failed!${NC}"
    echo "========================================"
fi

exit $EXIT_CODE
