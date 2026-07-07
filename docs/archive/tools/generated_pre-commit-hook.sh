#!/bin/sh
# ClickFlash Pre-Commit Hook
# Blocks commits of .env files and other sensitive patterns
# Install: copy to .git/hooks/pre-commit and chmod +x

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
BLOCKED=0

echo "Running ClickFlash pre-commit checks..."

# Check for .env files (except .env.example and .env.template)
for file in $STAGED_FILES; do
    basename=$(basename "$file")
    if echo "$basename" | grep -qE '^\.env$'; then
        echo "ERROR: Blocked commit of $file"
        echo "       Move secrets to vault and use .env.example instead."
        BLOCKED=1
    fi
    if echo "$basename" | grep -qE '^\.env\.[^.]+$' && ! echo "$basename" | grep -qE '\.example$|\.template$'; then
        echo "ERROR: Blocked commit of $file"
        echo "       Move secrets to vault and use .env.example instead."
        BLOCKED=1
    fi
done

# Check for common secret patterns in staged files
for file in $STAGED_FILES; do
    # Only check text files
    if git show :"$file" | head -c 1000 | grep -qE 'sk_live_|pk_live_|AKIA[0-9A-Z]{16}|eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*'; then
        echo "WARNING: Potential secret detected in $file"
        echo "         Review before committing."
    fi
done

# Check for large binaries (>10MB)
for file in $STAGED_FILES; do
    size=$(git cat-file -s :"$file" 2>/dev/null || echo 0)
    if [ "$size" -gt 10485760 ]; then
        echo "WARNING: Large file detected ($size bytes): $file"
        echo "         Consider using Git LFS or external storage."
    fi
done

if [ "$BLOCKED" -eq 1 ]; then
    echo ""
    echo "Commit blocked. Fix the issues above and try again."
    exit 1
fi

echo "Pre-commit checks passed."
exit 0
