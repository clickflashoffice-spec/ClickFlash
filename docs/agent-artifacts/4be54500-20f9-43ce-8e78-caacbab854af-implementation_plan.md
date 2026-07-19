# Gallery App Polish & Infrastructure (Phase 2)

We will execute the remaining UI/UX and infrastructure tasks for `apps/gallery` to achieve the uncompromising "100% Custom / No Subscriptions" mandate while delivering a premium user experience.

## User Review Required
> [!IMPORTANT]
> The current Stripe webhook (`stripe-webhook.ts`) relies on `resend` to send emails. Resend violates the "No paid third-party SaaS" mandate. We will rip out Resend and replace it with a custom Nodemailer SMTP transport. Do you have a preferred SMTP host, or should we set it up to use generic environment variables for SMTP?

> [!CAUTION]
> Abandoned cart sync will aggressively ping the local backend (`/api/cart/sync`) on cart changes. Is a 30-second debounce acceptable for this?

## Open Questions
- Do you want the "Request Magic Link" flow in `CustomerLogin.tsx` to actually send an email (via our new custom Nodemailer setup) with a one-time token, or just mock the success state for now?

## Proposed Changes

---

### UI & Animations (Swipeable Lightbox)
Implement buttery smooth 60fps gestures using `framer-motion`.

#### [MODIFY] [EnhancedLightbox.tsx](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/components/customer/EnhancedLightbox.tsx)
- Replace rudimentary touch tracking with `framer-motion`'s `<motion.div drag="x">`.
- Add spring physics for swipe-to-navigate (left/right).
- Add swipe-to-dismiss (up/down drag) capability.

---

### Backend & Integrations
Rip out third-party SaaS and wire up abandoned carts.

#### [MODIFY] [stripe-webhook.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/backend/stripe-webhook.ts)
- Remove `resend` dependency completely.
- Implement `nodemailer` for sending confirmation emails via custom SMTP.
- Add local DB order status update mock/logic on `checkout.session.completed`.

#### [NEW] [useCartSync.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/hooks/useCartSync.ts)
- Create a hook to listen to cart changes in the UI.
- Push state to `/api/cart/sync` with a 30-second debounce.
- Saves cart payload attached to `customerEmail` or `sessionId` for D1 abandoned cart recovery.

---

### Auth & Proofing Experience
Refine passwordless flows and make UI highly responsive.

#### [MODIFY] [CustomerLogin.tsx](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/components/customer/CustomerLogin.tsx)
- Add "Email me a Magic Link" input field under the Magic Token tab.
- Send request to backend to generate token and dispatch email via Nodemailer.

#### [MODIFY] [CustomerLayout.tsx](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/components/customer/CustomerLayout.tsx)
- Implement **Optimistic Proofing**: When a user approves/rejects a photo, update the local React state instantly.
- Wrap the API call; if the API fails, automatically roll back the state and show an error toast.

## Verification Plan

### Automated Tests
- Run `npm run test:e2e` to verify checkout and auth flows.
- Verify Jest unit tests for `CustomerLogin` and `EnhancedLightbox`.

### Manual Verification
- Test swiping on `EnhancedLightbox` using Chrome DevTools mobile emulation.
- Monitor network tab for `/api/cart/sync` debounce behavior.
- Trigger a mock Stripe webhook locally to verify Nodemailer triggers instead of Resend.
