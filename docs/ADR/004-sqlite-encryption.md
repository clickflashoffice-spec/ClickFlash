# ADR 004: Encrypted SQLite for Local Data

## Status

**Accepted**

## Context

Master Portal and Touch Kiosk store sensitive data locally:

- Customer photos and thumbnails.
- Album metadata, order carts, and checkout state.
- Studio settings and cloud credentials (if cached).

A stolen or lost studio laptop must not expose customer photos or business data. We needed encryption at rest with minimal performance overhead.

## Decision

We will use **SQLite with hardware-accelerated encryption** via `better-sqlite3-multiple-ciphers`.

- The encryption key is derived from a studio-managed passphrase or stored in the OS credential store.
- All local SQLite databases (albums, orders, settings, sync queue) are encrypted by default.
- Backups of the database file are useless without the corresponding key.

## Consequences

### Positive

- **Strong at-rest protection**: SQLCipher-compatible AES-256 encryption.
- **Performance**: Hardware-accelerated encryption minimizes CPU overhead during high-volume imports.
- **Transparency**: Application code continues to use standard SQLite queries.
- **Compliance**: Aligns with GDPR and customer data protection expectations.

### Negative

- **Key management complexity**: Lost keys mean unrecoverable data; key escrow/backup process required.
- **Build complexity**: Native module must be rebuilt against each target Electron ABI.
- **Slightly larger bundle**: Native cipher library increases installer size.

### Neutral

- Encryption protects data at rest, not data in memory or in transit; those are covered by separate controls.

## Related ADRs

- [ADR 001: Dual-Backend Architecture](./001-dual-backend.md)
- [ADR 002: Kiosk Pairing](./002-kiosk-pairing.md)
