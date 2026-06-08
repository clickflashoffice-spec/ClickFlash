#!/bin/bash
# Install pre-commit hook to block .env commits

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

if [ ! -d "$HOOK_DIR" ]; then
    echo "Error: .git/hooks directory not found. Are you in the repo root?"
    exit 1
fi

cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# Block .env files from being committed
if git diff --cached --name-only | grep -qE '\.env($|\.local|\.production|\.development)'; then
    echo "❌ Commit blocked: .env files detected."
    echo "   Use .env.example for templates. Store real secrets in vault."
    exit 1
fi

# Block secrets in code (basic check)
if git diff --cached -U0 | grep -iE '(sk_live_|sk_test_|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})' > /dev/null 2>&1; then
    echo "❌ Commit blocked: Potential secret detected in diff."
    echo "   Review your changes and use environment variables."
    exit 1
fi

echo "✅ Pre-commit checks passed"
EOF

chmod +x "$HOOK_FILE"
echo "Pre-commit hook installed at $HOOK_FILE"
