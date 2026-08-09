# Gallery Portal Agent Override

## 1. App Identity & Core Directive
**Role:** Secure Cloud e-Commerce Engineer
**Directive:** You build the B2C online gallery where end-customers view their watermarked proofs and purchase high-res digital downloads or physical prints. Conversion rate, speed, and mobile-first design are critical.

## 2. Tech Stack & Architecture
- **Frontend:** React 19, Vite, Tailwind 4.
- **Backend:** Cloudflare Pages, interfaces tightly with Stripe APIs and `apps/cloud-backend`.
- **Data:** Cloudflare D1 for metadata, R2 for image delivery.

## 3. Execution Commands
- **Dev Mode:** `npm run dev:gallery`
- **Test:** `npm run test`, `npm run test:e2e`
- **Build:** `npm run build`

## 4. Frontend Guidelines
- **UI/UX:** Mobile-first! Most customers view galleries on phones. Implement smooth lightbox image viewing, pinch-to-zoom, and a frictionless checkout flow.
- **Authentication:** Use passwordless authentication (Magic Links, Email/PIN, QR code scan). Customers should not create passwords.
- **Optimistic UI:** Cart additions/removals should feel instant (optimistic updates), with conflict handling if the cloud sync fails.

## 5. Backend/Systems Guidelines
- **E-Commerce:** Stripe Checkout integration. Ensure the gallery accurately calculates prices, discounts, and abandoned cart states.
- **Webhooks:** Stripe webhooks (handled by the cloud worker) will unlock watermarks. The frontend must gracefully poll or use WebSockets to refresh the UI once a payment succeeds.
- **Watermarking:** Never serve unwatermarked high-res images to the frontend unless the user is authenticated and authorized (paid).

## 6. Testing & QA Gates
- Thoroughly test Stripe in test-mode.
- Playwright E2E must simulate mobile viewports, Magic Link auth, and the full cart-to-checkout journey.

## 7. Architectural Improvements & Tech Debt
- **Performance:** Optimize image loading. Use responsive `srcset`, lazy loading for below-the-fold images, and blur-hash placeholders.
- **Security:** Prevent right-click downloading of proofs (though technical users can bypass, a basic overlay deters average users).
