# Guest-Facing Web Gallery Migration

## Goal Description
We need to connect the React-based Guest Gallery (`apps/gallery`) to the new Cloudflare Worker API (`apps/cloud-backend`). Currently, the Gallery is trying to connect to the old legacy Node.js/Express server on `localhost:8093`. 

By porting the Gallery to run entirely on **Cloudflare Pages** and query the **Cloudflare Worker (Hono API)**, we achieve the "Zero Paid SaaS" and edge-first performance goals for a $1B valuation. Furthermore, we will integrate the newly built **Gemini AI Tagging** so guests can simply type "red shirt" in the search bar and instantly find themselves!

> [!WARNING]
> ## User Review Required: Backend Endpoint Porting
> Migrating the gallery requires me to add several new endpoints to the Cloud Backend (`apps/cloud-backend/src/index.ts`). I will need to implement:
> - `POST /api/gallery-auth/login` (Verify event access code)
> - `GET /api/photos` (Fetch photos for an event from D1)
> - `GET /api/photos/:id/download-url` (Generate presigned R2 download link)
>
> Is this the correct scope for the next sprint?

> [!IMPORTANT]
> ## Open Questions
> 1. **Stripe Checkout**: The legacy gallery supported Stripe checkouts. Do you want me to port the Stripe Checkout session generation to the Cloudflare Worker right now, or should we focus purely on the photo viewing and AI search experience first?
> 2. **Authentication**: Currently, guests log in with an `accessCode`. Do we need Magic Links, or is the simple event `accessCode` enough for now?

---

## Proposed Changes

### `apps/cloud-backend/`

#### [MODIFY] `src/index.ts`
- Add `POST /api/gallery-auth/login` to authenticate an access code against the D1 `events` table and return a simple JWT.
- Add `GET /api/photos` to query the D1 `photos` table for the authenticated event. This will include the `ai_tags` JSON blob.

### `apps/gallery/`

#### [MODIFY] `src/components/customer/CustomerGallery.tsx`
- Ensure the search bar maps the guest's text input against the `aiTags` field. (I have already mocked this in the UI, but we will ensure it links perfectly to the new Hono API response).

#### [MODIFY] `src/services/apiService.ts` & `src/utils/env.ts`
- Repoint the API base URL from `localhost:8093` to the Cloudflare Worker URL.
- Update the fetch logic to hit the new Hono routes.

---

## Verification Plan

### Automated Tests
- N/A for edge worker migrations, but we will rely on TypeScript to ensure the types match.

### Manual Verification
- We will spin up the Gallery React app (`npm run dev`) and verify that it successfully authenticates an access code through the Cloudflare Worker.
- We will verify that typing "red shirt" filters the grid to only show photos where the `aiTags` contain "red".
