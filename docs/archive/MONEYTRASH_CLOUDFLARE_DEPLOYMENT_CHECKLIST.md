# MoneyTrash Cloudflare Deployment - Complete Checklist

> **Production Deployment Guide with Cloudflare Access**

---

## 📋 Pre-Deployment Checklist

### 1. Cloudflare Account Setup
- [ ] Cloudflare account with Workers access
- [ ] Wrangler CLI installed: `npm install -g wrangler`
- [ ] Authenticated: `wrangler login`
- [ ] Account ID confirmed: `wrangler whoami`

### 2. Local Environment
- [ ] Node.js 20+ installed
- [ ] Rust toolchain installed (for Tauri)
- [ ] Project cloned: `git clone <repo>`
- [ ] Dependencies installed: `npm install`

---

## 🚀 Phase 1: Deploy Cloudflare Backend

### Step 1: Navigate to Cloudflare Directory
```bash
cd apps/moneytrash/cloudflare
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Automated Setup
```bash
chmod +x setup.sh
./setup.sh
```

**This creates:**
- [ ] D1 Database: `moneytrash-db`
- [ ] R2 Bucket: `moneytrash-uploads`
- [ ] KV Namespace: `UPLOAD_SESSIONS`
- [ ] Worker deployed

### Step 4: Verify Deployment
```bash
# Check health
curl https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/health

# Expected output:
# {"status":"ok","service":"moneytrash-api","version":"4.2.0"}
```

**Status:** ☐ Complete

---

## 🔧 Phase 2: Configure Secrets

### Required Secrets
```bash
# In apps/moneytrash/cloudflare/

# 1. JWT Secret (required)
wrangler secret put JWT_SECRET
# Enter: <generate with: openssl rand -base64 32>

# 2. Stripe Secret (optional, for payments)
wrangler secret put STRIPE_SECRET_KEY
# Enter: sk_live_...

# 3. Webhook Secret (optional)
wrangler secret put WEBHOOK_SECRET
# Enter: <random string>

# 4. Master API Key (for office registration)
wrangler secret put MASTER_API_KEY
# Enter: <strong random string>
```

**Status:** ☐ Complete

---

## 🗄️ Phase 3: Database Setup

### Apply Schema
```bash
# Local testing
wrangler d1 execute moneytrash-db --file=schema/schema.sql --local

# Production
wrangler d1 execute moneytrash-db --file=schema/schema.sql --remote
```

### Verify Tables
```bash
wrangler d1 execute moneytrash-db --command="SELECT name FROM sqlite_master WHERE type='table';" --remote
```

Expected tables:
- [ ] `offices`
- [ ] `galleries`
- [ ] `assets`
- [ ] `orders`
- [ ] `upload_logs`
- [ ] `webhook_events`

**Status:** ☐ Complete

---

## 🏢 Phase 4: Register Office

### Create Your MoneyTrash Office
```bash
# Register via API
curl -X POST https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/office/register \
  -H "Content-Type: application/json" \
  -d '{
    "deskId": "MT-MAIN-01",
    "name": "Main Studio",
    "contactEmail": "studio@clickflash.app",
    "apiKey": "YOUR-MASTER-API-KEY"
  }'
```

### Save Response
```json
{
  "success": true,
  "office": {
    "id": "...",
    "deskId": "MT-MAIN-01",
    "apiKey": "mt_xxxxxxxxxx"
  },
  "token": "eyJhbG..."
}
```

**Save these values:**
- [ ] `deskId`: MT-MAIN-01
- [ ] `apiKey`: mt_xxxxxxxxxx
- [ ] `token`: eyJhbG...

**Status:** ☐ Complete

---

## 💻 Phase 5: Configure MoneyTrash App

### Update App Settings

In `apps/moneytrash/src/services/cloudApiService.ts` or via UI:

```typescript
const cloudConfig = {
  apiUrl: 'https://moneytrash-api.YOUR-ACCOUNT.workers.dev',
  deskId: 'MT-MAIN-01',
  apiKey: 'mt_xxxxxxxxxx',
  token: 'eyJhbG...'  // Optional, will be fetched
};
```

### Environment Variables (.env)
```bash
# apps/moneytrash/.env
VITE_CLOUD_API_URL=https://moneytrash-api.YOUR-ACCOUNT.workers.dev
VITE_OFFICE_DESK_ID=MT-MAIN-01
VITE_OFFICE_API_KEY=mt_xxxxxxxxxx
```

**Status:** ☐ Complete

---

## 🧪 Phase 6: End-to-End Testing

### Test 1: Health Check
```bash
curl https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/health
```
- [ ] Returns `{"status":"ok"}`

### Test 2: Office Verification
```bash
curl -X POST https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/office/verify \
  -H "Content-Type: application/json" \
  -d '{"deskId":"MT-MAIN-01","apiKey":"mt_xxxxxxxxxx"}'
```
- [ ] Returns token

### Test 3: Upload Flow
```bash
# 1. Init upload
SESSION=$(curl -X POST .../api/upload/chunk/init \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fileName":"test.jpg","fileSize":1024,"totalChunks":1,...}' | jq -r .sessionId)

# 2. Upload chunk
curl -X PUT .../api/upload/chunk \
  -F "sessionId=$SESSION" \
  -F "chunkIndex=0" \
  -F "chunk=@test.jpg"

# 3. Finalize
curl -X PATCH .../api/upload/chunk/finalize \
  -H "Authorization: Bearer TOKEN" \
  -d "{\"sessionId\":\"$SESSION\"}"
```
- [ ] Upload completes successfully
- [ ] Gallery URL returned
- [ ] Gallery accessible

### Test 4: MoneyTrash App
- [ ] App connects to Cloud API
- [ ] File upload works
- [ ] Progress tracking works
- [ ] Gallery created in Cloud

**Status:** ☐ Complete

---

## 🔄 Phase 7: Continuous Deployment

### GitHub Actions (Optional)
Create `.github/workflows/deploy-moneytrash-api.yml`:

```yaml
name: Deploy MoneyTrash API

on:
  push:
    branches: [main]
    paths:
      - 'apps/moneytrash/cloudflare/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Wrangler
        run: npm install -g wrangler
      
      - name: Deploy to Cloudflare
        working-directory: apps/moneytrash/cloudflare
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Add `CLOUDFLARE_API_TOKEN` to GitHub Secrets.

**Status:** ☐ Complete (Optional)

---

## 📊 Phase 8: Monitoring Setup

### Cloudflare Dashboard
- [ ] Workers & Pages → moneytrash-api
- [ ] Analytics tab reviewed
- [ ] Errors tab monitored
- [ ] Logs enabled

### Logpush (Optional)
```bash
wrangler logpush enable
```

### Custom Alerts
Set up alerts for:
- [ ] Error rate > 1%
- [ ] Request count spike
- [ ] Worker CPU time exceeded

**Status:** ☐ Complete

---

## 🔒 Phase 9: Security Hardening

### CORS Configuration
Verify in `wrangler.toml`:
```toml
[vars]
CORS_ORIGIN = "https://gallery.clickflash.app"
```

### Rate Limiting
- [ ] Default: 100 req/min verified
- [ ] Upload: 20 req/min verified
- [ ] Chunk: 100 req/min verified

### Authentication
- [ ] JWT expiration: 24 hours
- [ ] Token refresh working
- [ ] Invalid tokens rejected

**Status:** ☐ Complete

---

## 📦 Phase 10: Documentation

### Update Project Docs
- [ ] API endpoint documented
- [ ] Environment variables listed
- [ ] Deployment process recorded
- [ ] Troubleshooting guide updated

### Team Communication
- [ ] API URL shared with team
- [ ] Credentials stored securely (1Password/Vault)
- [ ] On-call rotation established

**Status:** ☐ Complete

---

## ✅ Final Verification

### Backend (Cloudflare)
- [ ] Worker deployed and running
- [ ] D1 database accessible
- [ ] R2 bucket receiving uploads
- [ ] KV namespace storing sessions
- [ ] All endpoints responding
- [ ] Authentication working
- [ ] Rate limiting active

### Frontend (MoneyTrash App)
- [ ] App builds successfully
- [ ] Connects to Cloud API
- [ ] Uploads complete
- [ ] Progress tracked
- [ ] Galleries created
- [ ] History persisted

### Integration
- [ ] Cloud Gallery receives uploads
- [ ] Customer can access galleries
- [ ] Orders backed up correctly
- [ ] Webhooks firing (if configured)

---

## 🎉 Deployment Complete!

Your MoneyTrash app is now fully deployed with Cloudflare backend.

### URLs
- **API**: `https://moneytrash-api.YOUR-ACCOUNT.workers.dev`
- **Health**: `https://moneytrash-api.YOUR-ACCOUNT.workers.dev/api/health`
- **Dashboard**: https://dash.cloudflare.com → Workers & Pages

### Support
- Cloudflare Status: https://www.cloudflarestatus.com/
- Workers Docs: https://developers.cloudflare.com/workers/
- D1 Docs: https://developers.cloudflare.com/d1/

---

## 🔄 Rollback Plan

If issues occur:

```bash
# List deployments
wrangler deployment list

# Rollback to previous
wrangler rollback DEPLOYMENT_ID

# Or disable worker temporarily
wrangler deploy --dry-run
```

---

**Last Updated:** March 2026  
**Version:** 4.2.0  
**Maintained by:** ClickFlash Team
