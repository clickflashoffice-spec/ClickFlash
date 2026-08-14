# Cloud Backend Override Rules

> **Target**: `apps/cloud-backend` (Cloudflare Worker)

## Domain Context
The central Cloudflare Worker handling database, storage, and payment infrastructure.

## Specific Constraints
- **Bindings**: Heavily utilizes D1 (SQLite), R2 (Object Storage), and Stripe.
- **Configuration**: Must retain `compatibility_flags = ["nodejs_compat"]` and `[observability] enabled = true`.
- **Node Constraints**: NEVER import Node-only modules (like `setInterval`, `http.IncomingMessage`) in Worker code.
- **Observability**: Use `@sentry/cloudflare` (NOT `@sentry/node`), wrapping with `Sentry.withSentry(env, handler)`.

## AI Instructions
Focus on edge performance, cold start times, and secure D1 transaction boundaries.
