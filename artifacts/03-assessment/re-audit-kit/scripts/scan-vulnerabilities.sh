#!/usr/bin/env bash
# Scan Vulnerabilities - Run security scans on all apps
# Usage: ./scan-vulnerabilities.sh

set -e

echo "=== ClickFlash Vulnerability Scanner ==="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APPS=("master" "touch" "moneytrash" "management" "gallery" "website")
TOTAL_VULNS=0

scan_app() {
    local app=$1
    local vulns=0
    
    echo "Scanning apps/$app..."
    
    if [ ! -d "apps/$app" ]; then
        echo -e "  ${YELLOW}[SKIP]${NC} Directory not found"
        return 0
    fi
    
    cd "apps/$app"
    
    # Check for package.json
    if [ ! -f "package.json" ]; then
        echo -e "  ${YELLOW}[SKIP]${NC} No package.json"
        cd ..
        return 0
    fi
    
    # Run npm audit
    if command -v npm &> /dev/null; then
        echo "  Running npm audit..."
        AUDIT_OUTPUT=$(npm audit --audit-level=high --json 2>/dev/null || echo '{}')
        
        # Extract vulnerability counts
        VULN_COUNT=$(echo "$AUDIT_OUTPUT" | grep -o '"metadata":[^}]*' | grep -o '"vulnerabilities":[0-9]*' | grep -o '[0-9]*$' || echo "0")
        
        if [ -n "$VULN_COUNT" ] && [ "$VULN_COUNT" -gt 0 ]; then
            echo -e "  ${RED}[FAIL]${NC} $VULN_COUNT vulnerabilities found"
            vulns=$VULN_COUNT
        else
            echo -e "  ${GREEN}[PASS]${NC} No high/critical vulnerabilities"
        fi
    fi
    
    cd ..
    TOTAL_VULNS=$((TOTAL_VULNS + vulns))
    echo ""
}

for app in "${APPS[@]}"; do
    scan_app "$app"
done

echo "=== Scan Complete ==="
if [ $TOTAL_VULNS -gt 0 ]; then
    echo -e "${RED}Total vulnerabilities: $TOTAL_VULNS${NC}"
    exit 1
else
    echo -e "${GREEN}All apps passed security scan${NC}"
    exit 0
fi