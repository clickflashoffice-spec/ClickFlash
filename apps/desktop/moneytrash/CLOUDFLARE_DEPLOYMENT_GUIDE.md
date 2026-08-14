# MoneyTrash Cloudflare Deployment Guide

Complete guide to deploy MoneyTrash backend to Cloudflare using your existing access.

## ✅ Prerequisites

- Cloudflare account with access
- Wrangler CLI installed: `npm install -g wrangler`
- Authenticated: `wrangler login`

## 🚀 Quick Deploy (5 minutes)

```bash
# 1. Navigate to Cloudflare directory
cd apps/moneytrash/cloudflare

# 2. Install dependencies
npm install

# 3. Run automated setup (creates D1, R2, KV, deploys worker)
chmod +x setup.sh
./setup.sh

# 4. Done! Your API is live.
```

## 📋 Manual Step-by-Step

### Step 1: Create Resources

```bash
# D1 Database (SQLite)
wrangler d1 create moneytrash-db
# Note the database_id from output

# R2 Bucket (File storage)
wrangler r2 bucket create moneytrash-uploads

# KV Namespace (Session cache)
wrangler kv:namespace create UPLOAD_SESSIONS
# Note the id from output
```

### Step 2: Update Configuration

Edit `wrangler.toml`:

```toml
# Replace these with your actual IDs from Step 1
[[d1_databases]]
binding = "DB"
database_name = "moneytrash-db"
database_id = "YOUR-ACTUAL-DATABASE-ID"

[[kv_namespaces]]
binding = "UPLOAD_SESSIONS"
id = "YOUR-ACTUAL-KV-ID"
```

### Step 3: Apply Database Schema

```bash
# Local (for testing)
wrangler d1 execute moneytrash-db --file=schema/schema.sql --local

# Production
wrangler d1 execute moneytrash-db --file=schema/schema.sql --remote
```

### Step 4: Set Secrets

```bash
# JWT secret (generate: openssl rand -base64 32)
wrangler secret put JWT_SECRET

# Stripe (optional, for payments)
wrangler secret put STRIPE_SECRET_KEY

# Webhook secret (generate random string)
wrangler secret put WEBHOOK_SECRET
```

### Step 5: Deploy

```bash
npm run deploy
# or
wrangler deploy
```

## 🔗 Configure MoneyTrash App

Once deployed, update your MoneyTrash app settings:

```typescript
// In MoneyTrash app settings
const config = {
  apiUrl: 'https://moneytrash-api.YOUR-ACCOUNT.workers.dev',
  deskId: 'MT-001',
  apiKey: 'your-office-api-key'
};
```

## 📊 Verify Deployment

### Health Check
```bash
curl https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "moneytrash-api",
  "version": "4.2.0"
}
```

### Test Upload Flow
```bash
# 1. Verify office
curl -X POST https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/office/verify \
  -H "Content-Type: application/json" \
  -d '{"deskId":"MT-001","apiKey":"your-key"}'

# 2. Init upload (use token from step 1)
curl -X POST https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/upload/chunk/init \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.jpg",
    "fileSize": 1048576,
    "totalChunks": 1,
    "metadata": {
      "event_name": "Test Event",
      "access_code": "TEST-123",
      "mode": "moneytrash",
      "mime_type": "image/jpeg"
    }
  }'
```

## 🔄 Update Deployment

```bash
# Make code changes, then:
npm run deploy

# View logs
wrangler tail

# Rollback if needed
wrangler rollback [DEPLOYMENT_ID]
```

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `database not found` | Run `wrangler d1 list` and update `wrangler.toml` |
| `KV namespace not found` | Run `wrangler kv:namespace list` and update ID |
| `JWT verification failed` | Regenerate secret: `wrangler secret put JWT_SECRET` |
| `CORS errors` | Check `wrangler.toml` CORS settings |
| `Upload fails` | Verify R2 bucket exists and is public |

## 📈 Monitor Usage

```bash
# View real-time logs
wrangler tail

# Check D1 queries
wrangler d1 execute moneytrash-db --command="SELECT COUNT(*) FROM upload_logs"

# List R2 objects
wrangler r2 object list moneytrash-uploads

# KV stats
wrangler kv:bulk get --namespace-id=YOUR_KV_ID
```

## 🌍 Custom Domain (Optional)

```bash
# Add custom domain
wrangler route add "api.yourdomain.com/*"

# Or in wrangler.toml:
# routes = [
#   { pattern = "api.yourdomain.com", custom_domain = true }
# ]
```

## 📦 Resources Created

| Resource | Purpose | Cost (Free Tier) |
|----------|---------|------------------|
| Worker | API runtime | 100k requests/day |
| D1 | SQLite database | 5GB storage |
| R2 | File storage | 1GB storage |
| KV | Session cache | 1GB storage |

## ✅ Post-Deploy Checklist

- [ ] Health check passes
- [ ] Office registration works
- [ ] Upload init works
- [ ] Chunk upload works
- [ ] Finalize creates gallery
- [ ] Gallery accessible via access code
- [ ] MoneyTrash app connects successfully
- [ ] Rate limiting active
- [ ] Logs appearing in tail

## 📚 Next Steps

1. **Configure MoneyTrash app** with production API URL
2. **Register your office** using the setup script
3. **Test upload flow** end-to-end
4. **Set up monitoring** in Cloudflare dashboard
5. **Configure Stripe** for payments (if needed)

---

**Need Help?**
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/
- D1 Docs: https://developers.cloudflare.com/d1/
