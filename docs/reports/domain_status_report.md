# ClickFlash Domain Status Report

**Date:** June 14, 2026
**Checked by:** Automated verification
**Method:** `curl -I -L --max-time 15`

## Summary Table

| Domain | Status | HTTP Code | SSL | Notes |
|--------|--------|-----------|-----|-------|
| clickflash.com | ✅ UP | 200 | Valid | Apex domain working |
| www.clicketflash.com | ✅ UP | 200 | Valid | WWW redirect working |
| gallery.clicketflash.com | ⚠️ Cloudflare 530 | 530 | Valid | Origin server error behind Cloudflare |
| admin.clicketflash.com | ❌ DNS Failure | 000 | N/A | No DNS record found |
| moneytrash.clickflash.app | ❌ DNS Failure | 000 | N/A | No DNS record found |

## Detailed Findings

### clickflash.com ✅
- **Status:** 200 OK
- **SSL:** Valid certificate
- **Server:** Cloudflare
- **Note:** Apex domain correctly configured

### www.clicketflash.com ✅
- **Status:** 200 OK
- **SSL:** Valid certificate
- **Server:** Cloudflare
- **Note:** WWW subdomain correctly configured

### gallery.clicketflash.com ⚠️
- **Status:** 530 (Cloudflare Origin Error)
- **SSL:** Valid certificate (Cloudflare edge)
- **Issue:** Cloudflare cannot connect to origin server
- **Action Required:** Check Cloudflare Dashboard → SSL/TLS → Origin Server certificate, or check if the origin server is running

### admin.clicketflash.com ❌
- **Status:** Could not resolve host
- **Issue:** No DNS record exists for this subdomain
- **Action Required:** Add DNS A/AAAA/CNAME record in Cloudflare Dashboard

### moneytrash.clickflash.app ❌
- **Status:** Could not resolve host
- **Issue:** No DNS record exists for this subdomain
- **Action Required:** Add DNS A/AAAA/CNAME record in Cloudflare Dashboard

## Comparison with Previous Check
- **No changes** from previous check (June 14, 2026)
- Same 3 domains working, same 2 domains with issues

## Recommended Actions

1. **gallery.clicketflash.com (530):**
   - Log into Cloudflare Dashboard
   - Check SSL/TLS → Origin Server certificate
   - Verify origin server is running and accessible
   - Check firewall rules blocking Cloudflare IPs

2. **admin.clicketflash.com (DNS Failure):**
   - Add DNS A record pointing to Cloudflare Pages or Worker
   - Or add CNAME record if using Pages

3. **moneytrash.clickflash.app (DNS Failure):**
   - Add DNS A record pointing to Cloudflare Pages or Worker
   - Or add CNAME record if using Pages

## Next Steps
- All 3 issues require Cloudflare Dashboard access (manual fixes)
- Cannot be automated without API token with Zone:Edit permissions
