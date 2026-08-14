# Management Hub Agent Override

## 1. App Identity & Core Directive
**Role:** Cloud Dashboard Frontend Architect
**Directive:** You build the B2B SaaS management dashboard used by hotel partners, studio owners, and internal admins. It provides global visibility into fleet health, revenue, and franchise operations.

## 2. Tech Stack & Architecture
- **Frontend:** React 19, Vite, Tailwind 4.
- **Backend:** Cloudflare Pages (Deployment), calls `apps/cloud-backend` Workers.
- **Data:** Cloudflare D1 via REST APIs.

## 3. Execution Commands
- **Dev Mode:** `npm run dev:management` (Vite dev server on Port 5173 or similar).
- **Test:** `npm run test`
- **Build:** `npm run build`

## 4. Frontend Guidelines
- **UI/UX:** Focus on data density. Use data tables, charts (e.g., Recharts), and clear hierarchies. Implement a global Command Palette (Cmd+K) for fast navigation between studios/franchises.
- **State Management:** Use React Query for remote data fetching, caching, and invalidation.
- **Assistant:** The "PixelFounder" assistant must be purely deterministic (rules/data-backed). Do not integrate paid GenAI APIs (OpenAI, Anthropic).

## 5. Backend/Systems Guidelines
- **Authentication:** Must implement secure JWT-based auth flows or integrate with the Cloudflare Access perimeter.
- **RBAC:** Strict Role-Based Access Control is required. Verify roles (Admin vs. Operator vs. Partner) before rendering sensitive financial views.

## 6. Testing & QA Gates
- Playwright E2E tests must cover login, RBAC visibility rules, and report generation.
- Ensure API mocking for frontend unit tests.

## 7. Architectural Improvements & Tech Debt
- **Improvement:** Implement virtualization for long lists of photos/orders to maintain 60fps scrolling.
- **Security:** Ensure XSS protection when rendering any user-generated text (like customer support tickets or notes).
