#!/usr/bin/env bash
# Scan Dependencies - Check for vulnerabilities and outdated packages
# Usage: ./scan-dependencies.sh [app-name]

set -e

APPS=("master" "touch" "moneytrash" "management" "gallery" "website")
TARGET="${1:-all}"

echo "=== ClickFlash Dependency Scanner ==="
echo "Target: $TARGET"
echo ""

scan_app() {
    local app=$1
    echo "Scanning apps/$app..."
    
    if [ ! -d "apps/$app" ]; then
        echo "  [SKIP] Directory not found"
        return
    fi
    
    cd "apps/$app"
    
    # Check for package.json
    if [ ! -f "package.json" ]; then
        echo "  [SKIP] No package.json"
        cd ../..
        return
    fi
    
    # Run npm audit
    echo "  Running npm audit..."
    npm audit --audit-level=high --quiet 2>/dev/null || true
    
    # Check for outdated packages
    echo "  Checking outdated packages..."
    npm outdated --depth=0 2>/dev/null || true
    
    cd ../..
    echo ""
}

if [ "$TARGET" == "all" ]; then
    for app in "${APPS[@]}"; do
        scan_app "$app"
    done
else
    scan_app "$TARGET"
fi

echo "=== Scan Complete ==="
echo "Review output above for vulnerabilities and outdated packages."