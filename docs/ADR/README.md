# Architecture Decision Records

> A curated index of significant architectural decisions in the ClickFlash ecosystem.

---

## Active Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR 001](./001-dual-backend.md) | Dual-Backend Architecture for Desktop Apps | Accepted | 2026-06 |
| [ADR 002](./002-kiosk-pairing.md) | LAN Kiosk Pairing Protocol | Accepted | 2026-06 |
| [ADR 003](./003-cloudflare-workers.md) | Cloudflare Workers as Cloud Runtime | Accepted | 2026-06 |
| [ADR 004](./004-sqlite-encryption.md) | Encrypted SQLite for Local Data | Accepted | 2026-06 |
| [ADR 005](./005-migration-strategy.md) | Incremental Migration Strategy | Accepted | 2026-06 |
| [ADR 006](./006-installer-architecture.md) | Unified Ecosystem Installer | Accepted | 2026-06 |

---

## Superseded / Legacy Records

| Record | Title | Status | Notes |
|--------|-------|--------|-------|
| [002-installer-architecture-legacy](./archive/002-installer-architecture-legacy.md) | Unified Installer Architecture (legacy numbering) | Superseded | Renumbered to ADR 006 |

---

## How to Propose a New ADR

1. Copy the template from an existing ADR.
2. Use the next available number.
3. Open a PR with the `docs/` label.
4. Require review from at least one senior engineer.

---

## ADR Format

Each ADR includes:

- **Status**: Proposed / Accepted / Deprecated / Superseded
- **Context**: The forces and constraints that led to the decision
- **Decision**: What we decided and why
- **Consequences**: Positive, negative, and neutral outcomes
- **Related ADRs**: Links to dependent or conflicting decisions
