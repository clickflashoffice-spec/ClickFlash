# The Auto-Loop (CI/CD Pipeline)

The ClickFlash Auto-Loop is an automated pipeline designed to enforce code quality, run exhaustive test suites, and deploy applications without human intervention. 

It is implemented via **GitHub Actions** and triggers automatically on every push to the `main` branch.

## Pipeline Stages

### 1. Verification Phase
- **Linting & Formatting:** Runs `npm run lint:all` to ensure code adheres to standard conventions.
- **Type Checking:** Runs `tsc --noEmit` across all apps and shared packages.

### 2. Testing Phase
- **Unit Tests:** Executes Vitest/Jest suites for utility functions.
- **End-to-End (E2E) Tests:** 
  - Spins up Playwright.
  - Executes `tests/e2e/checkout-flow.spec.ts` to simulate a complete customer interaction.
  - Executes `tests/e2e/memory-leak.spec.ts` to ensure memory consumption remains stable over iterative renders.
- **Failure Condition:** If *any* test fails, the pipeline aborts, and deployment is blocked.

### 3. Build & Package Phase (Electron Apps)
- **Frontend Build:** Runs `vite build` to compile the React UI.
- **Backend Build:** Runs `esbuild` to compile the Express/IPC backend.
- **Native Rebuild:** Recompiles native Node.js modules (like `better-sqlite3` and `sharp`) against the target Electron ABI.
- **Packaging:** Uses `electron-builder` to generate `.exe` installers for Master and Touch apps.

### 4. Deployment Phase
- **Native App Releases:** Automatically creates a Draft Release on GitHub and attaches the `.exe` installers. Over-the-air (OTA) updates are triggered once the draft is published.
- **Cloud App Deployments:** Vercel (or Cloudflare) Webhooks are pinged to deploy the Gallery and Management apps to their production domains.

## Over-The-Air (OTA) Updates
Because the Master and Touch apps run on customer hardware, updates are distributed via `electron-updater`.
1. The Auto-Loop publishes a new GitHub Release.
2. The Electron apps poll the GitHub API for updates.
3. Upon detection, the `.exe` is downloaded in the background and silently installed upon the next application restart.
