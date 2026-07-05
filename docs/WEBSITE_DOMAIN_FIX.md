# Website Domain Fix Required

## Problem
- `www.clicketflash.com` → ✅ Works (Cloudflare Pages)
- `clickflash.com` (apex) → ❌ Parked at GoDaddy for-sale page

## Root Cause
The apex domain `clickflash.com` is not configured in the Cloudflare Pages project. Only the `www` subdomain is attached.

## Fix Steps (Cloudflare Dashboard)

1. Go to https://dash.cloudflare.com → Pages → `clickflash-website` project
2. Click **Custom Domains** tab
3. Click **Set up a custom domain**
4. Enter `clickflash.com` (apex domain)
5. Cloudflare will verify DNS and issue SSL certificate automatically

## Alternative: DNS Redirect
If apex domain cannot be added to Pages directly, create a DNS redirect:
- In Cloudflare DNS for `clickflash.com`, add a **Redirect Rule**:
  - `clickflash.com/*` → `https://www.clicketflash.com/$1` (301 redirect)

## Verification After Fix
```bash
curl -sI https://clickflash.com
# Should return: HTTP/2 200 with Cloudflare headers
```

## Impact
- SEO: Apex domain redirect prevents duplicate content penalties
- User experience: Users typing `clickflash.com` will reach the site
- Brand consistency: Both www and apex work
