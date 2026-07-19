# Deploy Cloud Backend to Cloudflare & Update Project Documentation

The goal of this phase is to transition the `apps/cloud-backend` from a local development setup (Miniflare/Wrangler local) to a full production deployment on Cloudflare. Alongside this, we will update the project's markdown documentation and rule files (`AGENTS.md`, `README.md`, etc.) to firmly establish this production-level architecture and update agent rules and roles.

## User Review Required

> [!WARNING]
> **Production Secrets & Database**: 
> 1. To deploy to Cloudflare successfully, you must be logged into Wrangler (`npx wrangler login`).
> 2. We will need to provision a real D1 database (`npx wrangler d1 create clickflash-db`) and R2 bucket on your Cloudflare account.
> 3. We will need to upload the `PRIVATE_KEY_PEM` (and other secrets like Stripe keys) to Cloudflare using `npx wrangler secret put`. I cannot do this automatically without your explicit action or passing the secrets directly.

## Open Questions

> [!IMPORTANT]
> 1. **Cloudflare Account**: Are you already logged into Cloudflare via Wrangler on your machine? If not, I will need you to run `npx wrangler login` in the terminal.
> 2. **Environment Variables**: Do you want me to generate a new production RSA-4096 key pair and automatically upload it to Cloudflare as a secret during deployment, or do you have an existing one?
> 3. **Management Dashboard URL**: Should I also deploy the `apps/management` dashboard to Cloudflare Pages, or are we just deploying the backend for now?

## Proposed Changes

### Cloudflare Deployment (`apps/cloud-backend`)

- Provision a production D1 Database on Cloudflare.
- Provision a production R2 Bucket on Cloudflare.
- Generate and upload the production RSA-4096 private key as a Cloudflare Secret (`PRIVATE_KEY_PEM`).
- Update `wrangler.toml` with the real `database_id` and correct bindings.
- Run `npm run deploy` to publish the worker to Cloudflare.

### Documentation Updates (Markdown Files)

#### [MODIFY] `AGENTS.md`
- Update the **Project Structure** and **Development Commands** sections to indicate that `apps/cloud-backend` is deployed to Cloudflare Workers and is a production-level service.
- Update the **Core Persona** and **Context Management** to reflect that the ecosystem is now in a production state, shifting focus from scaffolding to maintenance and ops.

#### [MODIFY] `README.md` / `CLAUDE.md`
- Update architecture diagrams and text to show Cloudflare Workers (D1, R2) as the production backend.
- Document the commands required for production deployment (`npm run deploy` in `cloud-backend`).

#### [MODIFY] `apps/management/.env`
- Update the `VITE_API_URL` to point to the new production Cloudflare Worker URL (e.g., `https://clickflash-cloud-backend.<your-subdomain>.workers.dev`).

## Verification Plan

### Automated Tests
- Run `npm run typecheck` across the workspaces to ensure no regressions.

### Manual Verification
- We will use `curl` to hit the new production Cloudflare URL and generate a test license to verify that the crypto module and secrets are working correctly in the deployed Cloudflare environment.
- Verify that the Management dashboard correctly communicates with the production backend to issue licenses.
