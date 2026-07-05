#!/bin/bash
# ClickFlash Master Service - Smoke Test Script
# Quick validation of all API endpoints

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8090}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=${3:-200}
    local data=${4:-}
    
    local url="${BASE_URL}${endpoint}"
    local response
    local status
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null || echo -e "\n000")
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PATCH -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null || echo -e "\n000")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$url" 2>/dev/null || echo -e "\n000")
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $method $endpoint ($status)"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $method $endpoint (expected $expected_status, got $status)"
        echo "  Response: $body"
        ((FAIL++))
    fi
}

echo "=========================================="
echo "ClickFlash Master Service - Smoke Tests"
echo "URL: $BASE_URL"
echo "=========================================="
echo ""

# Health
echo "[Health]"
test_endpoint "GET" "/api/health"

# Auth
echo ""
echo "[Auth]"
test_endpoint "POST" "/api/auth/login" "401" '{"email":"invalid","password":"invalid"}'

# Collections
echo ""
echo "[Collections]"
test_endpoint "GET" "/api/collections/destinations"
test_endpoint "GET" "/api/collections/kiosks"
test_endpoint "GET" "/api/collections/orders"

# Orders
echo ""
echo "[Orders]"
test_endpoint "GET" "/api/orders"

# Sync
echo ""
echo "[Sync]"
test_endpoint "GET" "/api/sync/status"

# Pairing
echo ""
echo "[Pairing]"
test_endpoint "GET" "/api/pairing/status"

# System
echo ""
echo "[System]"
test_endpoint "GET" "/api/system/health"
test_endpoint "GET" "/api/system/stats"

echo ""
echo "=========================================="
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "=========================================="

if [ $FAIL -gt 0 ]; then
    exit 1
fi
