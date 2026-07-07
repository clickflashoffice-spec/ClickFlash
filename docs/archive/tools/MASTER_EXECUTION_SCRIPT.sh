#!/bin/bash
# ============================================================================
# CLICKFLASH MASTER EXECUTION SCRIPT
# Automates remaining human actions where possible
# Run from repo root: bash master_execution_script.sh
# WARNING: Review each section before running. Some steps require manual
# dashboard access and cannot be fully automated.
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

echo '========================================'
echo 'CLICKFLASH MASTER EXECUTION SCRIPT'
echo '========================================'
echo ''

# ============================================================================
# SECTION 1: Install Pre-Commit Hook (blocks .env commits)
# ============================================================================
echo '[1/7] Installing pre-commit hook...'
if [ -f docs/audit/tools/generated_pre-commit-hook.sh ]; then
  cp docs/audit/tools/generated_pre-commit-hook.sh .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  echo '✅ Pre-commit hook installed'
else
  echo '⚠️ Pre-commit hook template not found'
fi
echo ''

# ============================================================================
# SECTION 2: Remove .env files from git tracking (surgical purge)
# ============================================================================
echo '[2/7] Removing .env files from git tracking...'
# Note: This does NOT purge git history. For full purge, use git-filter-repo.
git rm -r --cached .env apps/*/.env apps/*/*/.env 2>/dev/null || true
git rm -r --cached apps/master/configs/*.env apps/master/backend/setup/profiles/*.env 2>/dev/null || true
echo '.env' >> .gitignore
echo '*.env' >> .gitignore
echo '!.env.example' >> .gitignore
git add .gitignore
git commit -m "security: remove .env files from tracking and update gitignore" || echo 'Nothing to commit'
echo '✅ .env files removed from current tracking'
echo ''

# ============================================================================
# SECTION 3: Install dependencies with new catalog/overrides
# ============================================================================
echo '[3/7] Running pnpm install with updated catalog/overrides...'
pnpm install
echo '✅ Dependencies installed'

echo '[3/7] Running pnpm audit...'
pnpm audit --prod --audit-level high || echo '⚠️ Audit found issues — review above'
echo ''

# ============================================================================
# SECTION 4: TypeScript typecheck across all apps
# ============================================================================
echo '[4/7] Running typecheck across all apps...'
for app in master touch gallery management moneytrash website installer; do
  if [ -f "apps/$app/package.json" ]; then
    echo "  Typechecking $app..."
    pnpm --filter "$app" typecheck 2>/dev/null || echo "    ⚠️ $app typecheck failed or not configured"
  fi
done
echo '✅ Typecheck complete (review failures above)'
echo ''

# ============================================================================
# SECTION 5: Build all apps
# ============================================================================
echo '[5/7] Building all apps...'
for app in master touch gallery management moneytrash website installer; do
  if [ -f "apps/$app/package.json" ]; then
    echo "  Building $app..."
    pnpm --filter "$app" build 2>/dev/null || echo "    ⚠️ $app build failed or not configured"
  fi
done
echo '✅ Build complete (review failures above)'
echo ''

# ============================================================================
# SECTION 6: Run tests across all apps
# ============================================================================
echo '[6/7] Running tests...'
pnpm -r run test:ci 2>/dev/null || pnpm -r run test 2>/dev/null || echo '⚠️ Tests failed or not configured'
echo '✅ Test run complete (review failures above)'
echo ''

# ============================================================================
# SECTION 7: Manual steps that CANNOT be automated
# ============================================================================
echo '[7/7] REMINDER: The following steps require MANUAL action:'
echo ''
echo '--- SECRET ROTATION (P0) ---'
echo '1. Stripe: https://dashboard.stripe.com/apikeys — revoke old, create new restricted key'
echo '2. Resend: https://resend.com/api-keys — revoke old, create new'
echo '3. Cloudflare: https://dash.cloudflare.com/profile/api-tokens — roll tokens'
echo '4. Generate new JWT_SECRET: openssl rand -hex 32'
echo '5. Update wrangler secrets: wrangler secret put JWT_SECRET'
echo '6. Populate vault (1Password/Doppler) with new values'
echo '7. Git history purge (if team approves force-push):'
echo '   pip install git-filter-repo'
echo '   git filter-repo --replace-text <<EOF'
echo '   .env==***REMOVED***'
echo '   EOF'
echo '   git push origin --force --all'
echo ''
echo '--- DUAL BACKEND (P0) ---'
echo '8. Review 61 frontend API files (see WS02_dual_backend_resolution_report.json)'
echo '9. Update VITE_API_URL to Worker domain only'
echo '10. Run Playwright E2E on gallery + management'
echo ''
echo '--- MIGRATION CONSOLIDATION (P1) ---'
echo '11. Reconcile schemas into packages/database/schema/unified.sql'
echo '12. Rewrite 240 migrations to timestamp format'
echo '13. Merge 44 duplicate-prefix files'
echo '14. Add DOWN scripts and idempotency'
echo ''
echo '--- DEPENDENCY ALIGNMENT (P2) ---'
echo '15. Update each app package.json to use catalog: references'
echo '16. Add CI enforcement: pnpm audit --prod --audit-level high'
echo ''
echo '========================================'
echo 'SCRIPT COMPLETE'
echo '========================================'
