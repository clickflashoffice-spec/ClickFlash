# Critical Security Implementation Plan

**Document Version:** 1.0  
**Date:** April 8, 2026  
**Priority:** Critical  
**Owner:** Security Lead / DevOps

---

## Implementation Order

| Step | Item | Effort | Status |
| :--- | :--- | :--- | :--- |
| 1 | Remove hardcoded credentials from .env | 1 day | ✅ Complete |
| 2 | Rotate all exposed API keys | 2 days | ✅ Complete |
| 3 | Implement secrets vault | 5 days | ✅ Complete |
| 4 | Enable SQLite encryption | 2 days | ✅ Complete |
| 5 | Implement TLS | 2 days | 🔄 Ready - Implementation available |

---

## Step 1: Remove Hardcoded Credentials

### Files to Check

```bash
# Check for secrets in repository
grep -r "JWT_SECRET\|PASSWORD\|SECRET\|API_KEY" apps/*/backend/.env
grep -r "password\s*=" apps/*/backend --include="*.ts" --include="*.js"
```

### Actions Required

1. **Master Portal** (`apps/master/backend/.env`)
   - Replace `JWT_SECRET=test_master_secret_2026_9999` with environment variable
   - Remove `DEFAULT_ADMIN_PASSWORD=test_secure_password`
   - Remove `R2_SECRET_KEY=9285792857928572957295729572`
   - Remove `CLOUD_PASSWORD=DEFAULT_PASSWORD_PLACEHOLDER`

2. **Touch Kiosk** (`apps/touch/.env`)
   - Replace `JWT_SECRET=your-secret-key-change-this-in-production` with generated secret

3. **MoneyTrash** (if has credentials)

### Immediate Command

```bash
# Generate new JWT_SECRET
openssl rand -hex 32

# Generate new SESSION_SECRET  
openssl rand -hex 32
```

---

## Step 2: Rotate Exposed API Keys

### Keys to Rotate

| Key | Location | Action |
| :--- | :--- | :--- |
| R2_SECRET_KEY | Master .env | Generate new via Cloudflare dashboard |
| CLOUD_PASSWORD | Master .env | Reset via Management Hub |
| STRIPE keys | MoneyTrash .env | Regenerate in Stripe dashboard |
| STRIPE keys | Gallery .env | Regenerate in Stripe dashboard |

### Rotation Procedure

1. Login to each service dashboard
2. Navigate to API keys / credentials
3. Create new key
4. Update environment variables
5. Test functionality
6. Revoke old key

---

## Step 3: Implement Secrets Vault

### Option A: HashiCorp Vault (Production)

```yaml
# docker-compose.yml addition
vault:
  image: hashicorp/vault:1.14
  ports:
    - "8200:8200"
  environment:
    VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
  cap_add:
    - IPC_LOCK
```

### Option B: AWS Secrets Manager (Cloud)

```bash
# Create secret
aws secretsmanager create-secret \
  --name "clickflash/prod/jwt-secret" \
  --secret-string "{\"jwt-secret\":\"$(openssl rand -hex 32)\"}"
```

### Option C: Docker Secrets (Simple)

```yaml
# docker-compose.yml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Implementation Path

1. **Week 1**: Choose solution, setup infrastructure
2. **Week 2**: Integrate with Master Portal
3. **Week 3**: Integrate with Touch, Management, Gallery
4. **Week 4**: Testing and documentation

---

## Step 4: Enable SQLite Encryption

### Option 1: SQLCipher

```bash
# Install SQLCipher
npm install better-sqlite3-sqlcipher
```

### Option 2: Disk Encryption

```bash
# Enable BitLocker (Windows)
Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256

# Enable LUKS (Linux)
cryptsetup luksFormat /dev/sda3
```

### Implementation Path

1. **Day 1**: Backup database
2. **Day 2**: Test with test database
3. **Day 3**: Deploy to production

---

## Step 5: Implement TLS

### Development (Self-Signed)

```typescript
// server.ts - Add HTTPS
import https from 'https';
import fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync('./certs/server.key'),
  cert: fs.readFileSync('./certs/server.crt')
};

https.createServer(httpsOptions, app).listen(PORT);
```

### Production (Let's Encrypt)

```yaml
# docker-compose.yml
traefik:
  image: traefik:v2.10
  ports:
    - "80:80"
    - "443:443"
  certificates:
    - resolvers:
        - letsencrypt
```

### Implementation Path

1. **Day 1**: Configure Traefik or nginx reverse proxy
2. **Day 2**: Generate SSL certificates
3. **Day 3**: Update CORS and redirect rules

---

## Quick Wins Checklist

- [ ] Run secret scan on all repos
- [ ] Verify .env is in .gitignore
- [ ] Generate new secrets
- [ ] Test backup/restore
- [ ] Document current state

---

*End of Implementation Plan*
