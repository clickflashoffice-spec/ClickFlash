# MoneyTrash Cloudflare Worker API

Serverless API for MoneyTrash Uploader built on Cloudflare Workers, D1, R2, and KV.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐                                        │
│  │   Cloudflare Worker │  API Gateway & Business Logic          │
│  │   (TypeScript)      │                                        │
│  └──────────┬──────────┘                                        │
│             │                                                    │
│    ┌────────┼────────┬──────────────┐                          │
│    │        │        │              │                          │
│    ▼        ▼        ▼              ▼                          │
│ ┌──────┐ ┌──────┐ ┌────────┐  ┌─────────┐                     │
│ │ D1   │ │  R2  │ │  KV    │  │Analytics│                     │
│ │ (SQL)│ │(Files│ │(Session│  │         │                     │
│ │      │ │      │ │ Cache) │  │         │                     │
│ └──────┘ └──────┘ └────────┘  └─────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Services

| Service | Purpose | Binding |
|---------|---------|---------|
| **D1** | SQLite database for offices, galleries, orders | `DB` |
| **R2** | File storage for uploaded photos | `UPLOADS_BUCKET` |
| **KV** | Upload session cache & rate limiting | `UPLOAD_SESSIONS` |
| **Workers** | API endpoints & business logic | - |

## 🚀 Quick Start

### 1. Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### 2. Setup (One-time)

```bash
cd apps/moneytrash/cloudflare
chmod +x setup.sh
./setup.sh
```

This creates:
- D1 Database
- R2 Bucket  
- KV Namespace
- Deploys the Worker

### 3. Deploy Updates

```bash
npm run deploy
# or
./deploy.sh production
```

## 📋 API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/office/register` | POST | Register new office |
| `/api/office/verify` | POST | Verify credentials |

### Protected Endpoints (Require JWT)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload/chunk/init` | POST | Initialize upload session |
| `/api/upload/chunk` | PUT | Upload chunk |
| `/api/upload/chunk/finalize` | PATCH | Complete upload |
| `/api/upload/chunk/cancel` | POST | Cancel upload |
| `/api/galleries` | POST | Create gallery |
| `/api/galleries/:code` | GET | Get gallery |

## 🔐 Authentication

### Register Office

```bash
curl -X POST https://moneytrash-api.your-account.workers.dev/api/office/register \
  -H "Content-Type: application/json" \
  -d '{
    "deskId": "MT-001",
    "name": "Studio Downtown",
    "contactEmail": "studio@clickflash.app",
    "apiKey": "master-api-key"
  }'
```

### Verify & Get Token

```bash
curl -X POST https://moneytrash-api.your-account.workers.dev/api/office/verify \
  -H "Content-Type: application/json" \
  -d '{
    "deskId": "MT-001",
    "apiKey": "mt_generated_key"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h"
}
```

### Use Token

```bash
curl -X POST https://moneytrash-api.your-account.workers.dev/api/upload/chunk/init \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 📤 Upload Flow

```bash
# 1. Initialize
SESSION=$(curl -X POST .../api/upload/chunk/init \
  -d '{"fileName": "photo.jpg", "fileSize": 5242880, ...}' | jq -r .sessionId)

# 2. Upload chunks
for i in {0..4}; do
  curl -X PUT .../api/upload/chunk \
    -F "sessionId=$SESSION" \
    -F "chunkIndex=$i" \
    -F "chunk=@part$i.bin"
done

# 3. Finalize
curl -X PATCH .../api/upload/chunk/finalize \
  -d '{"sessionId": "'"$SESSION"'"}'
```

## 🗄️ Database Schema

See [schema/schema.sql](schema/schema.sql) for full schema.

Key tables:
- `offices` - Registered MoneyTrash stations
- `galleries` - Photo galleries
- `assets` - Uploaded photos
- `orders` - Customer orders
- `upload_logs` - Upload audit trail

## 📊 Monitoring

### View Logs
```bash
wrangler tail
```

### Analytics Dashboard
Cloudflare Dashboard → Workers & Pages → moneytrash-api → Analytics

### Custom Analytics
```bash
# Query upload stats
wrangler d1 execute moneytrash-db --command="SELECT * FROM upload_logs ORDER BY created_at DESC LIMIT 10"
```

## 🔒 Security

- JWT tokens expire after 24 hours
- Rate limiting on all endpoints
- Webhook signatures verified
- File size limits enforced
- CORS configured for allowed origins

## 🛠️ Development

### Local Development
```bash
npm run dev
```

### Database Migrations
```bash
# Apply schema locally
wrangler d1 execute moneytrash-db --file=schema/schema.sql --local

# Apply to production
wrangler d1 execute moneytrash-db --file=schema/schema.sql --remote
```

### Set Secrets
```bash
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put WEBHOOK_SECRET
```

## 📈 Pricing

Cloudflare free tier includes:
- 100,000 Worker requests/day
- 5GB D1 storage
- 1GB R2 storage
- 1GB KV storage

See [Cloudflare Pricing](https://developers.cloudflare.com/workers/platform/pricing/) for paid plans.

## 📝 License

Proprietary - ClickFlash
