# ADR 002: LAN Kiosk Pairing Protocol

## Status

**Accepted**

## Context

Touch Kiosk must connect to Master Portal in venues where:

- Internet connectivity is unreliable or unavailable.
- Multiple studios may operate on the same shared network.
- Customer privacy is paramount; the kiosk should not store long-lived credentials.

We needed a discovery and authentication mechanism that is local, simple, and secure enough for a transient customer-facing device.

## Decision

We will implement **LAN-only kiosk pairing** with the following protocol:

1. **Discovery**: Master advertises itself via mDNS/Bonjour service `_clickflash-master._tcp` on the local network.
2. **Challenge**: Touch discovers the service and requests a pairing token from Master.
3. **Authorization**: Master presents a one-time pairing token or PIN to the photographer, who enters it on the Touch Kiosk.
4. **Token issuance**: Master issues a short-lived JWT (5-minute expiration) bound to the current session and tenant.
5. **Connection**: Touch opens a WebSocket to Master authenticated by the JWT.
6. **Sync**: Master pushes album data, photo metadata, and order state over the WebSocket.

Touch stores no cloud credentials and no persistent Master authentication material.

## Consequences

### Positive

- **Privacy first**: Kiosk operates without internet access and holds no long-lived secrets.
- **Zero configuration**: Automatic discovery removes the need for IP entry in most networks.
- **Session isolation**: A new pairing token is required for each event/session.
- **Auditable**: Pairing events are logged with Master ID, Touch ID, timestamp, and result.

### Negative

- **Shared network risk**: On untrusted LANs, mDNS spoofing or MITM is possible. Mitigated by short-lived tokens and physical proximity.
- **Network dependency**: Both devices must be on the same broadcast domain for discovery.
- **Token rotation**: Photographers must re-pair if the JWT expires before the WebSocket opens.

### Neutral

- Pairing is independent of cloud authentication; studios can run entirely offline.

## Related ADRs

- [ADR 001: Dual-Backend Architecture](./001-dual-backend.md)
- [ADR 004: SQLite Encryption](./004-sqlite-encryption.md)
