# Create Cloudflare API Token for DNS Editing

## Why This is Needed

Wrangler's OAuth authentication does NOT include `zone:edit` scope. 
DNS record editing requires a dedicated API token created in the Cloudflare Dashboard.

## Steps to Create Token

### 1. Go to Cloudflare Dashboard
```
https://dash.cloudflare.com/profile/api-tokens
```

### 2. Click "Create Token"

### 3. Use Custom Template

| Setting | Value |
|---------|-------|
| Token Name | `ClickFlash-DNS-Manager` |
| Permissions | `Zone:Edit` |
| Zone Resources | `Include: All zones` or `Include: Specific zone: clickflash.com` |
| Client IP Address Filtering | Optional (leave empty) |
| TTL | Optional (leave empty for permanent) |

### 4. Click "Continue to Summary" then "Create Token"

### 5. Copy the Token (shown ONLY once)

```
Example: abcdef1234567890abcdef1234567890abcdef12
```

### 6. Save to .env file

```bash
# Edit this file:
# apps/master/ClickFlash-Master-test-hotel-2/.env
# OR create a new file:
# .env.cloudflare

CLOUDFLARE_API_TOKEN=your-new-token-here
```

## What I Can Do With This Token

Once you provide the token, I can fix:

1. **gallery.clicketflash.com** → Add CNAME to `clickflash-gallery.pages.dev`
2. **admin.clicketflash.com** → Add CNAME to `management-hub.pages.dev`  
3. **moneytrash.clickflash.app** → Add CNAME to moneytrash Worker/Pages

## Verification Commands

After saving the token, I will run:

```bash
# Verify token works
curl -X GET "https://api.cloudflare.com/client/v4/zones?name=clickflash.com" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List DNS records
curl -X GET "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Security Notes

- This token has ZONE EDIT permission — keep it secure
- Never commit it to git (add to .gitignore)
- Rotate every 90 days
- Use IP filtering if possible
- Only share via secure channels
