# ClickFlash Enterprise Security Blue Book (V7.0)

> Comprehensive Security, Cryptography, and Privacy Architecture Specification for Resort Media & Automated Concession Operations.

---

## 1. Cryptographic Identity & Hardware Licensing

```
┌────────────────────────────────────────────────────────┐
│               Hardware License Enclave                 │
│  ┌────────────────────────┐    ┌────────────────────┐  │
│  │ CPU / BIOS / MAC Hash  │ ── │ SHA-256 Digest     │  │
│  └────────────────────────┘    └────────┬───────────┘  │
│                                         ▼              │
│  ┌────────────────────────┐    ┌────────────────────┐  │
│  │ Master Public Key      │ ── │ Ed25519 Signature  │  │
│  │ (Embedded in Binary)   │    │ Verification       │  │
│  └────────────────────────┘    └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Cryptographic Scheme**: Asymmetric **Ed25519** digital signatures with hardware binding.
- **Hardware Fingerprint Elements**: SHA-256 hash of Motherboard UUID, Primary CPU Serial, and Primary Network MAC.
- **Offline Node Validation**: Master Studio nodes validate license files locally without requiring an active internet connection.
- **Tamper Protection**: Any modification to the machine identifier or license payload invalidates the signature and locks the SQLite database.

---

## 2. Biometric Vector Security & Guest Privacy (GDPR / CCPA / BIPA)

- **Vector-Only Storage**: Raw guest selfie photos captured at Kiosks or Self-Service are converted to 512-dimensional floating-point embeddings via ArcFace. Raw selfie images are **never persisted to disk** unless explicitly opted-in for account creation.
- **Anonymized Indexing**: Embeddings are stored in SQLite VP-Trees with anonymous session identifiers (`ses_anon_...`).
- **Data Retention & Auto-Purge**:
  - Unclaimed biometric vectors are purged automatically after **72 hours**.
  - Purchased photo packages transition to guest cloud vaults encrypted with client-side derived keys.
- **Right to Erasure (GDPR Art. 17)**: Instant 1-click biometric purge API endpoint (`DELETE /api/privacy/purge-biometrics`) removes all vectors and linked thumbnails across Edge and Cloud.

---

## 3. Financial & Payment Tokenization (PCI-DSS Level 1)

- **Zero Cardholder Data (CHD) Footprint**: Credit card numbers and CVV codes never touch ClickFlash servers.
- **Stripe Elements & Terminal SDK**: All payments in Touch Kiosk, Customer Gallery, and Management Hub use sandboxed Stripe iframes / SDKs.
- **Idempotent Webhooks**: Cloudflare Worker validates HMAC-SHA256 signatures (`verifyStripeSignature`) before recording ledger transactions into D1.

---

## 4. Edge-to-Cloud Network Security & Storage

- **Presigned URLs**: Direct-to-R2 uploads and high-res downloads use time-limited HMAC-SHA256 presigned URLs (15-minute TTL).
- **Mutual TLS (mTLS) & Tokenized Discovery**: LAN communication between Touch Kiosks and Master Studio Hub uses local tokenized headers with UDP broadcast discovery.
- **Database Encryption**: Local SQLite databases on Edge nodes use SQLCipher / `better-sqlite3-multiple-ciphers` with ChaCha20-Poly1305 / AES-256-GCM.

---

## 5. Threat Modeling & Incident Response Matrix

| Threat Scenario | Attack Vector | Mitigation / Defense Control | Severity |
| :--- | :--- | :--- | :---: |
| **Physical Node Theft** | Attacker steals Master PC from attraction booth. | Full-disk encryption + SQLCipher hardware-locked key derivation. | **HIGH** |
| **Tampered Ingest Payload** | Malicious photographer uploads poisoned EXIF/payload. | WASM Sharpness parser runs in sandboxed memory buffer with strict boundary checks. | **MEDIUM** |
| **Replay Attack on Licensing** | Copying valid license file to another kiosk. | License signature includes unique hardware fingerprint; mismatch triggers immediate lock. | **HIGH** |
| **Unauthenticated Kiosk IPC** | Malicious iframe attempts Electron IPC call. | IPC channel validation rejects any sender with untrusted web origin (`contextIsolation: true`). | **CRITICAL** |
