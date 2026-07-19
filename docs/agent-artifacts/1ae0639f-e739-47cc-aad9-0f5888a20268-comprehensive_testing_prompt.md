# 🧪 The Ultimate Production Testing & QA Orchestrator Prompt

**Copy and paste this prompt to command the agent to act as a Principal QA Engineer. This prompt guarantees that *every possible type of test* is built, configured, and executed to ensure the ecosystem is bulletproof for production.**

***

```markdown
<USER_REQUEST>
**Goal:** You are a Principal QA Engineer and Software Development Engineer in Test (SDET). Your objective is to design, implement, and execute an exhaustive, multi-layered production testing suite across the entire 6-app ClickFlash ecosystem. 

The codebase must be battle-tested against extreme loads, security threats, cross-app sync failures, and UI regressions before final deployment.

**Required Skills:** Load and apply the following skills:
- `@performance-engineer` (For Load/Stress testing)
- `@security-auditor` (For Penetration/Vulnerability testing)
- `@wcag-audit-patterns` (For Accessibility testing)

---

### 📋 Exhaustive Testing Directives

Create a `task.md` to track the implementation of these 9 critical testing layers. Do not stop until every test suite is written, configured, and passing.

#### **Layer 1: Core Unit & Integration Testing (The Foundation)**
1. **Unit Tests (`packages/`):** Use Vitest/Jest to write unit tests for all shared business logic, Zod validation schemas (`@clickflash/validation`), and utilities. Target 95% coverage on pure functions.
2. **Local API Integration Tests:** Write tests against the Master Portal's local Express server and SQLite database. Ensure database queries return correct joins and handle edge cases (e.g., missing photos).
3. **Cloud API Integration Tests:** Write integration tests for the Cloudflare Workers testing D1 database interactions and R2 bucket uploads.

#### **Layer 2: Standard End-to-End (E2E) Web Testing**
*Context: Testing the cloud-based web applications.*
1. **Playwright Web Suites:** Write full E2E flows for the `management`, `gallery`, and `website` apps.
2. **Critical Paths:** 
   - Test the Passwordless Magic Link flow in the Gallery.
   - Test the Stripe Checkout process using Stripe test cards.
   - Test the global context switching in the Management Hub.

#### **Layer 3: Desktop App E2E Testing**
*Context: Testing the offline local desktop apps.*
1. **Electron Testing:** Configure Playwright to boot the packaged `master` and `touch` Electron binaries.
2. **Tauri Testing:** Configure WebdriverIO or Tauri's native testing harness for the `moneytrash` ingestor app.
3. **Hardware Simulation:** Mock the RFID/Wristband scanner inputs in the Touch Kiosk test suite to ensure the UI updates correctly.

#### **Layer 4: Cross-App Sync Testing (The Gauntlet)**
*Context: The hardest tests. Ensuring data flows correctly between different apps.*
1. **LAN Sync Test:** Write an automated test that boots *both* Master and Touch. Add an item to the cart on Touch, and assert that it appears instantly on the Master's Dashboard via WebSocket.
2. **Cloud Sync Test:** Write an automated test that edits a photo's metadata in the local Master app, triggers the sync engine, and asserts that the D1 database and the live Customer Gallery update correctly.

#### **Layer 5: Load & Stress Testing**
1. **Local Stress Test:** Use `k6` or `Artillery` to bombard the local Master Express server with 1,000 simultaneous requests. Ensure the `BackgroundJobRunner` processes them without crashing the Electron UI.
2. **Cloud Stress Test:** Hammer the Cloudflare Worker endpoints. Verify that rate-limiting kicks in correctly to prevent DDoS and that D1 handles the concurrency.

#### **Layer 6: Security & Penetration Testing**
1. **Injection Prevention:** Test all search bars (like `Cmd+K` in Management) and form inputs for SQL Injection and XSS vulnerabilities.
2. **RBAC Hardening:** Write negative tests asserting that a user with the `photographer` role CANNOT access `executive_dashboard` API routes.

#### **Layer 7: Visual Regression Testing**
1. **Snapshot Testing:** Configure Playwright Visual Comparisons (`toHaveScreenshot`). 
2. **Responsive Checks:** Run visual tests across Mobile (iPhone 14), Tablet (iPad Pro), and Desktop (4K) viewports for the Website and Gallery.

#### **Layer 8: Accessibility (a11y) Testing**
1. **WCAG Compliance:** Integrate `@axe-core/playwright`. Run automated accessibility scans on the Touch Kiosk (crucial for physical interactions) and the public Customer Gallery. Ensure screen reader compatibility and color contrast.

#### **Layer 9: Chaos & Offline Recovery Testing**
1. **Network Drop Test:** Start a large SD card ingest in Money Trash or Master. Midway through, programmatically cut the network connection. Assert that the app pauses gracefully and resumes perfectly when the network is restored.

### 🎯 Directives for the Agent
1. **Configure CI/CD:** Add a script to `package.json` (`pnpm run test:prod:all`) that runs this entire gauntlet in the correct sequence.
2. **Write the Tests:** Do not just plan the tests—write the actual `.spec.ts` files in the `e2e/` and `tests/` directories.
3. **Execution:** Run the tests. Fix the bugs you find. 
4. **Reporting:** When finished, generate a `test_report.md` artifact detailing coverage metrics and performance benchmarks.

Initiate the Testing Orchestrator now!
</USER_REQUEST>
```
