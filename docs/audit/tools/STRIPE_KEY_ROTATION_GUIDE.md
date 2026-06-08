# STRIPE KEY ROTATION GUIDE

## Key Found
- **Type:** Stripe Restricted Test Key (`rk_test_`)
- **Prefix:** rk_test_51Tfm2N
- **Status:** EXPOSED in 4 file(s)

## Immediate Actions Required

### 1. Rotate the Key (Manual — Requires Dashboard Access)
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Find the restricted key starting with `rk_test_51Tfm2N`
3. Click **"Roll key"** or delete and create a new one
4. Copy the new key

### 2. Update Environment Files
Replace the old key in all `.env` files:
```bash
# Find all .env files with Stripe keys
grep -r "rk_test_51Tfm2N" apps/ --include="*.env"
```

### 3. Purge from Git History
```bash
# Install git-filter-repo if not already installed
pip install git-filter-repo

# Create a replacement file
cat > stripe-replacements.txt << 'EOF'
[REDACTED]==>STRIPE_TEST_KEY_PLACEHOLDER
EOF

# Run the filter
git filter-repo --replace-text stripe-replacements.txt

# Force push (coordinate with team first!)
git push origin --force --all
```

### 4. Verify Purge
```bash
# Confirm key is gone from history
git log --all --full-history -S "rk_test_51Tfm2N"
# Should return no results
```

## Files to Update
- `docs/audit/tools/ALL_STRIPE_KEYS_FOUND.json` (line 28)
- `docs/audit/tools/ALL_STRIPE_KEYS_FOUND.json` (line 29)
- `docs/audit/tools/STRIPE_KEY_ROTATION_ANALYSIS.json` (line 5)
- `docs/audit/tools/STRIPE_KEY_ROTATION_ANALYSIS.json` (line 14)
## Prevention
- [ ] Move all secrets to a vault (1Password, Doppler, etc.)
- [ ] Use `wrangler secret put` for Cloudflare Workers
- [ ] Add `.env` to `.gitignore` (already done)
- [ ] Install pre-commit hook to block secret commits (already generated)
- [ ] Run `git-secrets` or `trufflehog` in CI

---
*This key is a TEST key, so no live transactions are at risk. Rotate it anyway for hygiene.*
