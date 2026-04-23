# Secrets Vault Implementation

## Option 1: Docker Secrets (Recommended for Simple Setup)

### Create secrets directory
```bash
mkdir -p secrets
```

### Generate secrets
```bash
# JWT Secret
openssl rand -hex 32 > secrets/jwt_secret.txt

# Session Secret  
openssl rand -hex 32 > secrets/session_secret.txt

# R2 Secret Key
openssl rand -hex 32 > secrets/r2_secret_key.txt
```

### Update docker-compose.yml
```yaml
version: '3.8'

services:
  master:
    build: ./apps/master
    secrets:
      - jwt_secret
      - session_secret
    environment:
      - JWT_SECRET=/run/secrets/jwt_secret
      - SESSION_SECRET=/run/secrets/session_secret

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  session_secret:
    file: ./secrets/session_secret.txt
  r2_secret_key:
    file: ./secrets/r2_secret_key.txt
```

---

## Option 2: HashiCorp Vault (Production)

### docker-compose.vault.yml
```yaml
version: '3.8'

services:
  vault:
    image: hashicorp/vault:1.14
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
      VAULT_TOKEN: root
    cap_add:
      - IPC_LOCK
    volumes:
      - vault-data:/vault/data

volumes:
  vault-data:
```

### Initialize Vault
```bash
# Start vault
docker-compose -f docker-compose.vault.yml up -d

# Initialize
docker exec vault vault operator init \
  --key-shares=1 \
  --key-threshold=1 \
  --format=json > vault-keys.json

# Unseal
docker exec vault vault operator unseal $(jq -r '.unseal_keys_b64[0]' vault-keys.json)

# Login
docker exec vault vault login $(jq -r '.root_token' vault-keys.json)

# Create secret
docker exec vault vault kv put secret/clickflash \
  jwt_secret="your-jwt-secret" \
  r2_secret_key="your-r2-key"
```

---

## Option 3: AWS Secrets Manager

### Script to fetch secrets
```typescript
// src/utils/secrets.ts
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<string> {
  const response = await client.getSecretValue({ SecretId: secretName });
  return response.SecretString || '';
}

// Usage
const jwtSecret = await getSecret('clickflash/jwt-secret');
```

---

## Implementation Progress

| Step | Status | Notes |
| :--- | :--- | :--- |
| Generate new JWT secrets | ✅ Done | Both Master and Touch updated |
| Remove hardcoded credentials | ✅ Done | Replaced with CHANGEME placeholders |
| Create Docker Secrets setup | ✅ Done | Config created |
| Implement Vault | ⏳ Pending | Optional for production |

---

*End of Vault Implementation*
