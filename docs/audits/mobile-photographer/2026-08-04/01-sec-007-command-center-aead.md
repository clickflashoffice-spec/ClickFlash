# SEC-007 Command-Center AEAD Evidence

As-of: 2026-08-04.

## Implemented boundary

The paired Android command-center flow no longer accepts a plaintext success mode. A request must include an HMAC-signed `CF-MOBILE-COMMAND-CENTER-REQUEST-V2` transcript containing the `CF-AEAD-V1` requirement and the credential's active pairing epoch. Master compares that epoch with the persisted device row before serving data; a missing encryption requirement receives `426 Upgrade Required`, and a stale epoch receives `401`.

For every accepted request, Master:

1. derives a 32-byte response key with HKDF-SHA256 from the existing 32-byte ECDH pairing secret;
2. domain-separates the key by flow, direction, Master, device, pairing epoch, request timestamp, and request nonce;
3. encrypts the strict shared snapshot with AES-256-GCM using a fresh 12-byte IV and 16-byte tag;
4. binds protocol, algorithm, direction, method, path, status, Master, device, pairing epoch, timestamp, nonce, and period as associated data; and
5. hashes and HMAC-signs the exact serialized envelope as an additional request-nonce-bound integrity layer.

Android accepts the response only after the response protocol, encryption suite, pairing epoch, exact body hash, and HMAC pass. It then validates a strict five-field envelope, derives the same request-specific key in the native module, authenticates/decrypts through Expo Crypto AES-GCM, decodes UTF-8, parses JSON, and validates the shared command-center schema. The UI labels this accurately as payload protection and continues to state that managed TLS is pending.

Re-pairing rotates both the root secret and persisted pairing epoch. Requests carrying the retired epoch or secret fail before a snapshot is returned.

## Evidence

| Gate | Result |
|---|---:|
| Mobile focused tests | **37/37 PASS** |
| Mobile TypeScript | **PASS** |
| Mobile full lint | **0 errors / 17 pre-existing warnings** |
| Master paired-device command-center tests | **3/3 PASS** |
| Master server TypeScript | **PASS** |
| Android native HKDF tests, including Node-compatible empty-salt vector | **2/2 PASS** |
| `git diff --check` | **PASS** |

Focused tests cover authenticated encryption/decryption, exact-envelope authentication, plaintext downgrade denial, ciphertext/tag tampering, response replay under a different request nonce, stale request time, duplicate request nonce, wrong period, wrong pairing epoch, rotated secret, revoked/unassigned/role-drifted devices, and server-derived photographer scope. The endpoint fixture also proves that raw KPI field names and the seeded other-photographer revenue marker are absent from the wire body.

## Claim boundary and remaining SEC-007 work

This is application-layer confidentiality and integrity for the successful command-center JSON only. It does not hide IP addresses, ports, paths, headers, traffic size, timing, discovery metadata, or generic pre-authentication errors. It is not TLS and does not create forward secrecy after pairing.

SEC-007 remains active until all of the following are evidenced:

- encrypt or migrate capture status, JPEG/NEF chunks, commit metadata, and receipts;
- cover or disable legacy LAN settings, shifts, biometric vectors, and queued-sync paths;
- include filename and every upload semantic field in authenticated context;
- replace unsigned health-based endpoint relocation with an authenticated probe;
- protect paired-device roots at rest on Master and define durable rotation/recovery policy;
- provision per-Master certificate identity, pin/trust policy, rotation, revocation, and rollback;
- make managed TLS fail closed, disable release cleartext, and retain no V2-to-V1 fallback;
- run restart, concurrency, IV-uniqueness, tamper-proxy, packet-inspection, penetration, lost-device, restore, clock-skew, and physical Android acceptance suites.

No production deployment, signing, certificate issuance, customer-media test, or paid pilot was performed or authorized in this checkpoint.
