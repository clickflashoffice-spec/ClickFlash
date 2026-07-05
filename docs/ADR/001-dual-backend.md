# ADR 001: Dual-Backend Architecture for Desktop Apps

## Status

**Accepted**

## Context

Master Portal and Touch Kiosk are Electron desktop applications that must:

1. Perform privileged system operations (file system access, native image processing, encrypted SQLite).
2. Serve watermarked images and JSON payloads to iPads or external displays on the same LAN.
3. Remain offline-first; cloud connectivity is optional.

A single IPC-only backend could not cleanly serve HTTP assets to external devices. A single HTTP-only backend inside the renderer process could not access the file system or native modules securely. We needed a hybrid approach.

## Decision

We will use a **dual-backend architecture** inside each desktop app:

- **Electron IPC backend** — Handles privileged operations: file system, `sharp` image processing, SQLite reads/writes, device pairing, OS integration.
- **Express.js local HTTP backend** — Runs on a dedicated port (8090 for Master, 8091 for Touch) inside the Electron main process. Serves assets and stateless JSON to the React UI and external LAN devices.

The React UI communicates with:

- IPC for system-level commands.
- HTTP `fetch` for asset loading and LAN-facing APIs.

## Consequences

### Positive

- **Security**: Renderer never has direct file-system access; IPC channels are allow-listed and context-isolated.
- **Flexibility**: iPads and external displays can consume gallery data over standard HTTP without Electron-specific clients.
- **Offline resilience**: Both backends run locally; no cloud dependency for core workflows.
- **Familiarity**: Express patterns are well-known and easy to test.

### Negative

- **Complexity**: Two communication surfaces (IPC + HTTP) require two sets of handlers, types, and tests.
- **Port management**: Firewall rules and port conflicts must be handled by the installer.
- **Mental overhead**: Developers must choose the correct backend for each operation.

### Neutral

- Native modules (`better-sqlite3`, `sharp`) are rebuilt once and shared by both backends in the main process.

## Related ADRs

- [ADR 002: Kiosk Pairing](./002-kiosk-pairing.md)
- [ADR 006: Installer Architecture](./006-installer-architecture.md)
