# ADR 005: Incremental Migration Strategy

## Status

**Accepted**

## Context

ClickFlash evolved from a single desktop app into a six-app ecosystem. Early iterations used Supabase/PostgreSQL for cloud sync. As the platform grew, we introduced Cloudflare Workers, D1, and R2 for new cloud apps. A complete rewrite or big-bang migration would risk stability and customer data.

## Decision

We will follow an **incremental, strangler-fig migration strategy**:

1. **Preserve existing working systems** until replacements are proven in production.
2. **Build new cloud apps** (Management, Gallery, Update Server) on Cloudflare Workers/D1/R2.
3. **Introduce abstraction layers** in `packages/database` and `packages/types` so apps can switch backends behind stable interfaces.
4. **Migrate Master cloud sync** in phases:
   - Phase A: New uploads go to R2; metadata mirrored to D1.
   - Phase B: Legacy Supabase sync becomes read-only for historical data.
   - Phase C: Decommission Supabase sync once all studios are migrated.
5. **Maintain dual-write periods** to allow rollback without data loss.

## Consequences

### Positive

- **Low risk**: Existing customers are not forced onto new infrastructure prematurely.
- **Validation**: New systems are battle-tested before becoming the sole path.
- **Rollback safety**: Dual-write windows allow quick reversion.
- **Team velocity**: Migration work is chunked into deliverable phases.

### Negative

- **Operational complexity**: Running two storage backends during transition.
- **Data consistency**: Dual-write requires idempotency keys and conflict resolution.
- **Longer timeline**: Full decommission may take multiple quarters.

### Neutral

- Some legacy tables will remain in Supabase as an archive until legal retention periods expire.

## Related ADRs

- [ADR 003: Cloudflare Workers](./003-cloudflare-workers.md)
- [ADR 006: Installer Architecture](./006-installer-architecture.md)
