# MoneyTrash Cloudflare Provisioning Guide

## Overview

This guide walks through provisioning the Cloudflare resources needed for MoneyTrash:

- D1 Database (`moneytrash-db`)
- KV Namespace (`UPLOAD_SESSIONS`)
- R2 Bucket (`moneytrash-uploads`)

## Prerequisites

1. **Wrangler CLI** installed and authenticated:

   ```bash
   npm install -g wrangler
   npx wrangler login
   ```

2. **Cloudflare Account ID** ready (found in Cloudflare Dashboard)

3. **Cloudflare API Token** with permissions:
   - `Account Settings:Read`
   - `Workers:Edit`
   - `D1:Edit`
   - `R2:Edit`
   - `KV:Edit`

---

## Step 1: Provision D1 Database

### Option A: Using Wrangler CLI (Interactive)

```bash
cd workers/moneytrash-worker

# Create D1 database
npx wrangler d1 create moneytrash-db
```

**Output example:**

```
┌─────────────────────────────┐
│ D1 Database Created         │
├─────────────────────────────┤
│ Name: moneytrash-db          │
│ ID: x12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx │
│ Created: 2026-03-22         │
└─────────────────────────────┘
```

### Option B: Using API Directly

```bash
# Set variables
ACCOUNT_ID="your-account-id"
API_TOKEN="your-api-token"

# Create D1 database
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "moneytrash-db"}'
```

---

## Step 2: Create KV Namespace

```bash
# Create KV namespace for upload sessions
npx wrangler kv:namespace create UPLOAD_SESSIONS
```

**Output example:**

```
┌─────────────────────────────┐
│ KV Namespace Created        │
├─────────────────────────────┤
│ Name: UPLOAD_SESSIONS       │
│ ID: x12345678xxxxxxx        │
│ Created: 2026-03-22         │
└─────────────────────────────┘
```

---

## Step 3: Verify R2 Bucket

The R2 bucket `moneytrash-uploads` should already exist. Verify:

```bash
# List R2 buckets
npx wrangler r2 bucket list

# Or via API
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets" \
  -H "Authorization: Bearer ${API_TOKEN}"
```

**Expected bucket:**

- Name: `moneytrash-uploads`
- Permissions: Workers (Read/Write)

---

## Step 4: Execute Schema

After creating the D1 database, execute the schema:

```bash
# Replace <DATABASE_ID> with actual D1 database ID
npx wrangler d1 execute moneytrash-db \
  --database-id=<DATABASE_ID> \
  --file=schema/schema.sql
```

**Or execute SQL directly:**

```bash
npx wrangler d1 execute moneytrash-db \
  --database-id=<DATABASE_ID> \
  --command="SELECT 1"  # Test connection
```

---

## Step 5: Update wrangler.toml

Replace the placeholder IDs with actual values:

```toml
# Before (placeholder)
[[d1_databases]]
binding = "DB"
database_name = "moneytrash-db"
database_id = "your-d1-database-id"  # ← REPLACE THIS

[[kv_namespaces]]
binding = "UPLOAD_SESSIONS"
id = "your-kv-namespace-id"  # ← REPLACE THIS
```

```toml
# After (production)
[[d1_databases]]
binding = "DB"
database_name = "moneytrash-db"
database_id = "x12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Actual ID

[[kv_namespaces]]
binding = "UPLOAD_SESSIONS"
id = "x12345678xxxxxxx"  # Actual ID
```

---

## Step 6: Set Secrets

MoneyTrash Worker requires these secrets (not in wrangler.toml):

```bash
# Set JWT secret
npx wrangler secret put JWT_SECRET
# Enter: generate-a-secure-random-string-min-32-chars

# Set Stripe key (if using payments)
npx wrangler secret put STRIPE_SECRET_KEY
# Enter: sk_live_...

# Set webhook secret
npx wrangler secret put WEBHOOK_SECRET
# Enter: whsec_...
```

**Generate a JWT secret:**

```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) )
```

---

## Step 7: Deploy Worker

```bash
cd workers/moneytrash-worker

# Deploy to production
npx wrangler deploy

# Or deploy to preview
npx wrangler deploy --env preview
```

**Expected output:**

```
�着那 Deploying...
～
✓ service type: worker
✓ account id: x12345678xxxxxxxxxxxx
✓ script name: moneytrash-api
✓ ingress: https://moneytrash-api.<your-subdomain>.workers.dev
～
✓ Upload complete
  Status: http://localhost:8787 (waiting for build)
～
```

---

## Step 8: Verify Deployment

### Health Check

```bash
curl https://moneytrash-api.<your-subdomain>.workers.dev/api/health
```

**Expected response:**

```json
{
  "status": "ok",
  "service": "moneytrash-api",
  "version": "4.2.0",
  "timestamp": "2026-03-22T17:30:00.000Z"
}
```

### Test Office Registration

```bash
curl -X POST https://moneytrash-api.<your-subdomain>.workers.dev/api/office/register \
  -H "Content-Type: application/json" \
  -d '{
    "deskId": "MT-TEST-02",
    "name": "Test Station 2",
    "location": "Tunisia",
    "email": "test2@clickflash.app"
  }'
```

---

## Troubleshooting

### D1 Database Not Found

```
Error: D1_ERROR: No such database
```

**Solution:** Verify the database_id in wrangler.toml matches the created database.

### KV Namespace Not Found

```
Error: KV_ERROR: Namespace not found
```

**Solution:** Verify the KV namespace ID is correct.

### R2 Bucket Access Denied

```
Error: R2_ERROR: Access denied
```

**Solution:** Ensure the Worker has R2 bucket binding and bucket permissions.

### Secret Not Set

```
Error: Environment variable JWT_SECRET is not set
```

**Solution:** Run `npx wrangler secret put JWT_SECRET` for each required secret.

---

## Complete Provisioning Checklist

- [ ] Wrangler CLI installed and authenticated
- [ ] D1 database `moneytrash-db` created
- [ ] KV namespace `UPLOAD_SESSIONS` created
- [ ] R2 bucket `moneytrash-uploads` verified
- [ ] Schema executed on D1
- [ ] `wrangler.toml` updated with real IDs
- [ ] Secrets set (JWT_SECRET, STRIPE_SECRET_KEY, WEBHOOK_SECRET)
- [ ] Worker deployed
- [ ] Health check passed
- [ ] Registration endpoint tested

---

## Environment Variables Reference

| Variable                 | Required | Description                              |
| ------------------------ | -------- | ---------------------------------------- |
| `JWT_SECRET`             | ✅       | JWT signing secret (min 32 chars)        |
| `STRIPE_SECRET_KEY`      | ⚠️       | Stripe key (if payments enabled)         |
| `WEBHOOK_SECRET`         | ⚠️       | Stripe webhook secret                    |
| `ENVIRONMENT`            | ❌       | "production" or "development"            |
| `GALLERY_APP_URL`        | ❌       | Gallery app URL (default set)            |
| `MAX_UPLOAD_SIZE`        | ❌       | Max upload size in bytes (default: 50MB) |
| `CHUNK_SIZE`             | ❌       | Chunk size for uploads (default: 1MB)    |
| `MAX_CONCURRENT_UPLOADS` | ❌       | Max concurrent uploads (default: 5)      |
| `ALLOWED_ORIGINS`        | ❌       | CORS origins (comma-separated)           |

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026
