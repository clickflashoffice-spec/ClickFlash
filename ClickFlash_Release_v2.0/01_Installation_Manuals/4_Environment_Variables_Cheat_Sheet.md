# Environment Variables Cheat Sheet

## Local Studio (`apps/master` & `apps/touch`)
```env
PORT=8090
VITE_API_URL=http://localhost:8090
VITE_WS_URL=ws://localhost:8090
DB_PATH=./data/clickflash_local.db
LICENSE_PUBLIC_KEY=ed25519_public_key_hex
```

## Cloud Apps (`apps/management`, `apps/gallery`)
```env
VITE_CLOUDFLARE_WORKER_URL=https://api.clickflash.studio
STRIPE_PUBLIC_KEY=pk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```
