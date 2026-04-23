#!/usr/bin/env bash
# Scan Secrets - Detect hardcoded secrets in codebase
# Usage: ./scan-secrets.sh [path]

set -e

TARGET="${1:-.}"

echo "=== ClickFlash Secret Scanner ==="
echo "Scanning: $TARGET"
echo ""

# Patterns to detect (simplified for CI - production use TruffleHog)
PATTERNS=(
    "password\s*=\s*['\"][^'\"]{8,}['\"]"
    "secret\s*=\s*['\"][^'\"]{8,}['\"]"
    "jwt_secret\s*=\s*['\"][^'\"]{8,}['\"]"
    "api_key\s*=\s*['\"][^'\"]{8,}['\"]"
    "sk_live_[a-zA-Z0-9]\{24,\}"
    "pk_live_[a-zA-Z0-9]\{24,\}"
    "Bearer\s+[a-zA-Z0-9\-_]\{20,\}"
    "ghp_[a-zA-Z0-9]\{36,\}"
    "AKIA[A-Z0-9]\{16\}"
)

FOUND=0

for pattern in "${PATTERNS[@]}"; do
    echo "Checking pattern: $pattern"
    RESULTS=$(grep -rE "$pattern" "$TARGET" \
        --include="*.ts" \
        --include="*.tsx" \
        --include="*.js" \
        --include="*.json" \
        --include="*.yaml" \
        --include="*.yml" \
        --include="*.toml" \
        --exclude-dir=node_modules \
        --exclude-dir=dist \
        --exclude-dir=build \
        --exclude-dir=.git \
        -l 2>/dev/null || true)
    
    if [ -n "$RESULTS" ]; then
        echo "  [FOUND] Files with potential secrets:"
        for file in $RESULTS; do
            echo "    - $file"
            FOUND=1
        done
    fi
done

echo ""
if [ $FOUND -eq 1 ]; then
    echo "=== WARNINGS DETECTED ==="
    echo "Review files above for hardcoded secrets."
    echo "Consider using: truffleHog --repo ."
    exit 1
else
    echo "=== No obvious secrets detected ==="
    echo "(Use TruffleHog for deeper scanning)"
    exit 0
fi