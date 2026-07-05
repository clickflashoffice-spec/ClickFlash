# ADR 003: Cloudflare Workers as Cloud Runtime

## Status

**Accepted**

## Context

ClickFlash needs cloud backends for:

- Customer Gallery (public storefront + payments).
- Management Hub (admin dashboard + analytics).
- Update Server (OTA metadata).

The runtime must be globally distributed, cost-effective at scale, and integrate with object storage and a serverless database. We evaluated traditional container platforms (AWS ECS/Fargate, Railway, Fly.io) against edge-native platforms (Cloudflare Workers, Vercel Edge Functions, Deno Deploy).

## Decision

We will use **Cloudflare Workers** as the primary cloud runtime for Management Hub, Customer Gallery, and the Update Server, paired with:

- **D1** for relational data.
- **R2** for object storage.
- **Cloudflare Pages / CDN** for static assets.

MoneyTrash Uploader uses Next.js 16 with a Tauri shell, and the Website uses Next.js 15; both deploy to Cloudflare Pages or Vercel as appropriate.

## Consequences

### Positive

- **Global latency**: Workers execute at the edge node closest to the user.
- **Cost efficiency**: Pay-per-request model aligns with bursty studio/event traffic.
- **Integrated ecosystem**: D1, R2, KV, Queues, and Images are all reachable from the same Worker.
- **Scalability**: No server provisioning; handles traffic spikes without manual intervention.
- **Edge watermarking path**: Image transforms can eventually run inside Workers or Cloudflare Images.

### Negative

- **Runtime constraints**: Worker CPU time and bundle size limits require careful code splitting.
- **Local debugging**: `wrangler dev` simulates the edge but is not identical to production.
- **Vendor lock-in**: D1 and R2 APIs are Cloudflare-specific; migration would require abstraction.
- **Cold starts rare but possible**: Extremely low frequency with Cloudflare, yet still a consideration for complex initializers.

### Neutral

- Existing Supabase/PostgreSQL sync path remains for legacy Master cloud sync until fully migrated.

## Related ADRs

- [ADR 005: Migration Strategy](./005-migration-strategy.md)
