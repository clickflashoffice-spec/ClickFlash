#!/bin/bash
# Wave 1 — Remove .env files from git tracking (run this manually)
# WARNING: This removes files from git but keeps them locally

cd "$(dirname "$0")/../.."

echo "Removing .env files from git tracking..."
git rm --cached '.env' 2>/dev/null || true
git rm --cached '.env.example' 2>/dev/null || true
git rm --cached 'apps\gallery\.env' 2>/dev/null || true
git rm --cached 'apps\gallery\.env.example' 2>/dev/null || true
git rm --cached 'apps\gallery\backend\.env' 2>/dev/null || true
git rm --cached 'apps\gallery\backend\.env.example' 2>/dev/null || true
git rm --cached 'apps\management\.env' 2>/dev/null || true
git rm --cached 'apps\management\.env.example' 2>/dev/null || true
git rm --cached 'apps\management\backend\.env' 2>/dev/null || true
git rm --cached 'apps\management\backend\.env.example' 2>/dev/null || true
git rm --cached 'apps\master\.env' 2>/dev/null || true
git rm --cached 'apps\master\.env.example' 2>/dev/null || true
git rm --cached 'apps\master\backend\.env' 2>/dev/null || true
git rm --cached 'apps\master\backend\.env.example' 2>/dev/null || true
git rm --cached 'apps\master\backend\setup\config-template.env' 2>/dev/null || true
git rm --cached 'apps\master\backend\setup\profiles\concorde.env' 2>/dev/null || true
git rm --cached 'apps\master\backend\setup\profiles\marhaba-club.env' 2>/dev/null || true
git rm --cached 'apps\master\backend\setup\profiles\marhaba-occidental.env' 2>/dev/null || true
git rm --cached 'apps\master\ClickFlash-Master-test-hotel-2\.env' 2>/dev/null || true
git rm --cached 'apps\master\configs\club.env' 2>/dev/null || true
git rm --cached 'apps\master\configs\concorde.env' 2>/dev/null || true
git rm --cached 'apps\master\configs\occidental.env' 2>/dev/null || true
git rm --cached 'apps\moneytrash\.env' 2>/dev/null || true
git rm --cached 'apps\moneytrash\.env.example' 2>/dev/null || true
git rm --cached 'apps\touch\.env' 2>/dev/null || true
git rm --cached 'apps\touch\.env.example' 2>/dev/null || true
git rm --cached 'apps\touch\backend\.env' 2>/dev/null || true
git rm --cached 'apps\touch\backend\.env.example' 2>/dev/null || true
git rm --cached 'apps\website\.env' 2>/dev/null || true
git rm --cached 'apps\website\.env.example' 2>/dev/null || true
git rm --cached 'claude-code\.env.example' 2>/dev/null || true
git rm --cached 'claude-code\web\.env.example' 2>/dev/null || true

echo "Adding .env to .gitignore if not present..."
grep -qxF '.env' .gitignore || echo '.env' >> .gitignore

echo "Committing cleanup..."
git add .gitignore
git commit -m "security: remove .env files from tracking and enforce .gitignore"

echo "Done. Remember to rotate all exposed secrets and push with force if needed."
