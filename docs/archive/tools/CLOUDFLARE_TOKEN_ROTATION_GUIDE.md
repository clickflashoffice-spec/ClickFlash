# CLOUDFLARE TOKEN ROTATION GUIDE

## Token Found
- **Type:** Cloudflare API Token (`cfut_`)
- **Prefix:** cfut_VMGMGxL1ABVuIWx6
- **Status:** NOT IN ACTIVE CODEBASE ✅

## Critical Discovery: ANOTHER Token IS Exposed

While your provided token is safe, I found **ANOTHER Cloudflare token** actively exposed:

| Token | Location | Status |
|-------|----------|--------|
| `[REDACTED]` | `apps/master/production-config.json:5` | 🚨 **EXPOSED** |

---

## Immediate Actions Required

### 1. Rotate YOUR Token (Manual)
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Find the token starting with `cfut_VMGMGxL1`
3. Click **"Roll"** or **"Delete"**
4. Create a new token with minimal required permissions:
   - Zone:Read (if reading zone info)
   - Zone.DNS:Edit (if managing DNS)
   - Workers Scripts:Edit (if deploying Workers)
   - R2:Edit (if using R2 storage)
5. Copy the new token

### 2. Rotate the EXPOSED Token (URGENT)
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Find the token starting with `cfut_WNDywpLDOQqLb9z3`
3. **Revoke it immediately** — it's exposed in `apps/master/production-config.json`
4. Create a new token
5. Update `apps/master/production-config.json` with the new token

### 3. Update Environment Files
```bash
# Find all files with Cloudflare tokens
grep -r "cfut_" apps/ --include="*.json" --include="*.env" --include="*.toml"
```

### 4. Purge from Git History
```bash
# Install git-filter-repo if not already installed
pip install git-filter-repo

# Create a replacement file for BOTH tokens
cat > cf-replacements.txt << 'EOF'
[REDACTED]==>CF_API_TOKEN_PLACEHOLDER
[REDACTED]==>CF_API_TOKEN_PLACEHOLDER
EOF

# Run the filter
git filter-repo --replace-text cf-replacements.txt

# Force push (coordinate with team first!)
git push origin --force --all
```

### 5. Verify Purge
```bash
# Confirm tokens are gone from history
git log --all --full-history -S "cfut_VMGMGxL1"
git log --all --full-history -S "cfut_WNDywpLDOQqLb9z3"
# Should return no results
```

---

## Files to Update
- `apps/master/production-config.json` (line 5) — **URGENT**
- Any `.env` files with `CLOUDFLARE_API_TOKEN`
- `wrangler.toml` files with `api_token`

---

## Prevention
- [ ] Move all tokens to a vault (1Password, Doppler, etc.)
- [ ] Use `wrangler secret put` for Worker secrets
- [ ] Add `production-config.json` to `.gitignore` if it contains secrets
- [ ] Install pre-commit hook to block secret commits
- [ ] Run `git-secrets` or `trufflehog` in CI

---
*Your provided token is NOT in the codebase. The exposed token `cfut_WNDywpLDOQqLb9z3...` requires immediate rotation.*
