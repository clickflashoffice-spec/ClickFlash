# SQLite Encryption Implementation

## Option 1: SQLCipher (Recommended)

### Install SQLCipher variant
```bash
npm install better-sqlite3-sqlcipher
```

### Database Configuration
```typescript
// apps/master/backend/shared/db.ts

import Database from 'better-sqlite3-sqlcipher';

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;

export function createDatabase(path: string, encryptionKey?: string) {
  const key = encryptionKey || ENCRYPTION_KEY;
  
  if (key) {
    // Encrypted database
    const db = new Database(path, { key });
    db.pragma('cipher_page_size = 4096');
    db.pragma('kdf_iter = 256000');
    db.pragma('cipher_hmac_algorithm = AES256');
    return db;
  }
  
  // Unencrypted database (development)
  return new Database(path);
}
```

### Environment Variable
```bash
# Generate 32-byte key for SQLCipher
openssl rand -hex 32

# Add to .env
DB_ENCRYPTION_KEY=your_32_byte_key_here
```

---

## Option 2: OS-Level Encryption (Simpler)

### Windows (BitLocker)
```powershell
# Enable BitLocker on data drive
Enable-BitLocker -MountPoint "D:" -EncryptionMethod XtsAes256 -UsedSpaceOnly
```

### Linux (LUKS)
```bash
# Create encrypted partition
cryptsetup luksFormat /dev/sda3

# Open encrypted partition
cryptsetup luksOpen /dev/sda3 encrypted_data

# Format
mkfs.ext4 /dev/mapper/encrypted_data

# Mount
mount /dev/mapper/encrypted_data /data
```

---

## Option 3: Application-Level (Transparent)

### For Node.js - Use node-native-encryption
```typescript
// Encrypt data before writing to SQLite
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptData(data: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}
```

---

## Backup Before Enabling Encryption

### Step 1: Export current data
```bash
# Master
sqlite3 apps/master/backend/pb_data/master.db ".backup master_backup.db"

# Touch
sqlite3 apps/touch/backend/pb_data/touch.db ".backup touch_backup.db"
```

### Step 2: Verify backup
```bash
sqlite3 master_backup.db "SELECT COUNT(*) FROM photos;"
```

### Step 3: Enable encryption in .env
```bash
# Add to .env
DB_ENCRYPTION_KEY=CHANGEME_add_32_byte_key
```

### Step 4: Test with new database first
```bash
# Create test encrypted database
sqlite3 test_encrypted.db "CREATE TABLE test (id INTEGER);"
```

---

## Configuration Checklist

- [ ] Backup existing databases
- [ ] Generate encryption key
- [ ] Add DB_ENCRYPTION_KEY to .env
- [ ] Update database connection code
- [ ] Test with small database
- [ ] Verify backup/restore works
- [ ] Document key storage location
- [ ] Plan key rotation

---

*End of SQLite Encryption Implementation*
