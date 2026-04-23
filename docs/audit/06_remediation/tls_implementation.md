# TLS Implementation Guide

**Status:** ✅ Implemented in Master Portal  
**Date:** April 8, 2026

---

## Implementation Complete

The Master Portal backend now supports TLS/SSL via environment configuration.

### Files Modified

- `apps/master/backend/config/tlsConfig.ts` - New TLS configuration module
- `apps/master/backend/config/constants.ts` - Added TLS constants
- `apps/master/backend/server.ts` - Integrated TLS server creation
- `apps/master/backend/.env` - Added TLS environment variables

### How to Enable TLS

1. **Option A: File-based certificates**
   ```bash
   # Generate self-signed certificates
   mkdir -p certs
   openssl genrsa -out certs/server.key 2048
   openssl req -new -x509 -key certs/server.key -out certs/server.crt -days 365 \
     -subj "/C=US/ST=State/L=City/O=ClickFlash/CN=localhost"
   ```

2. **Update .env**
   ```env
   TLS_ENABLED=true
   TLS_KEY_PATH=./certs/server.key
   TLS_CERT_PATH=./certs/server.crt
   ```

3. **Or use inline certificates (testing only)**
   ```env
   TLS_ENABLED=true
   TLS_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
   TLS_CERT="-----BEGIN CERTIFICATE-----\n..."
   ```

### Force HTTPS in Production

```env
FORCE_HTTPS=true
```

---

## Development (Self-Signed Certificates)

```bash
# Generate certificates
mkdir -p certs
openssl genrsa -out certs/server.key 2048
openssl req -new -x509 -key certs/server.key -out certs/server.crt -days 365 \
  -subj "/C=US/ST=State/L=City/O=ClickFlash/CN=localhost"
```

---

## Production (Let's Encrypt with Traefik)

### docker-compose.yml with Traefik
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
      - "8090:8090"
      - "8091:8091"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./certs:/certs
      - ./traefik.yml:/traefik.yml:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.master.rule=Host(`master.clickflash.local`)"
      - "traefik.http.routers.master.tls=true"
      - "traefik.http.routers.master.tls.certresolver=letsencrypt"

  master:
    build: ./apps/master
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.master.rule=Host(`master.clickflash.local`)"
      - "traefik.http.routers.master.tls=true"
```

### traefik.yml
```yaml
api:
  dashboard: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /certs/acme.json
      httpChallenge:
        entryPoint: web

entryPoints:
  web:
    address: :80
  websecure:
    address: :443
```

---

## Option 3: Nginx Reverse Proxy (Production)

### nginx.conf
```nginx
upstream master_backend {
    server localhost:8090;
}

upstream touch_backend {
    server localhost:8091;
}

server {
    listen 80;
    server_name master.clickflash.local;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name master.clickflash.local;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://master_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Start nginx
```bash
docker run -d \
  --name nginx-proxy \
  -p 80:80 -p 443:443 \
  -v ./nginx.conf:/etc/nginx/nginx.conf:ro \
  -v ./certs:/etc/nginx/ssl:ro \
  nginx:alpine
```

---

## CORS Update for HTTPS

### Update allowed origins in constants.ts
```typescript
export const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'https://localhost:8090',
      'https://localhost:8091',
      'https://your-production-domain.com',
    ];
```

---

## Force HTTPS in Production

### Express redirect middleware
```typescript
function forceHttps(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
}

app.use(forceHttps);
```

---

## Testing TLS

### Check certificate
```bash
# View certificate details
openssl x509 -in certs/server.crt -text -noout

# Test HTTPS connection
curl -k https://localhost:8090/api/health

# Check SSL grade (use online SSL Labs)
```

---

## Implementation Progress

| Step | Status | Notes |
| :--- | :--- | :--- |
| Generate self-signed certificates (dev) | ✅ Ready | Can be generated as needed |
| Configure Let's Encrypt (prod) | ⏳ Pending | Requires domain and Traefik setup |
| Configure nginx reverse proxy | ⏳ Pending | Requires production deployment |
| Force HTTPS redirect | 🔄 Ready | Code available, needs integration |
| CORS origins for HTTPS | ✅ Ready | Update ALLOWED_ORIGINS in constants |

## Quick Start - Development TLS

```bash
# Generate certificates
mkdir -p certs
openssl genrsa -out certs/server.key 2048
openssl req -new -x509 -key certs/server.key -out certs/server.crt -days 365 \
  -subj "/C=US/ST=State/L=City/O=ClickFlash/CN=localhost"
```

## Production Checklist

- [ ] Obtain domain (e.g., master.clickflash.com)
- [ ] Configure Traefik with Let's Encrypt
- [ ] Update DNS A records
- [ ] Test HTTPS endpoints
- [ ] Update CORS origins
- [ ] Monitor certificate expiration

---

*End of TLS Implementation*
