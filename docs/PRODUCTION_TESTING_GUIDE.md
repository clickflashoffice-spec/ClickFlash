# ClickFlash Production Testing Guide

This guide details how to execute production-level end-to-end (E2E) testing across the ClickFlash ecosystem, ensuring that operations across different applications and the Cloudflare Hub circulate correctly.

## 1. Test Architecture
We use **Playwright** to conduct true multi-environment testing. The `circulation.spec.ts` test actively boots both the Touch and Master applications simultaneously to verify they can talk to each other over the network layer.

## 2. Running E2E Tests Locally
You can run the full ecosystem tests locally on your development machine to verify everything before a release.

1. **Ensure Dependencies:** Make sure you have installed all dependencies via `npm install` at the root.
2. **Execute Tests:** Run the following command from the root directory:
   ```bash
   npm run test:all
   ```
   *This command leverages TurboRepo to run linting, unit tests, and Playwright tests sequentially.*

3. **Running Only Playwright Tests:**
   If you only want to test the specific circulation of data between Touch and Master:
   ```bash
   cd apps/master
   npx playwright test tests/e2e/circulation.spec.ts
   ```

## 3. What the Circulation Test Validates
The primary E2E circulation test does the following:
1. **Bootstraps Master:** Starts the Master portal on `localhost:8090` using the local SQLite database.
2. **Bootstraps Touch:** Starts the Touch kiosk and connects it to Master.
3. **Simulates Kiosk Usage:** Simulates a user selecting a session type, navigating the frames, and taking a photo on the Touch interface.
4. **Verifies Master Queue:** Asserts that the Master portal's Server-Sent Events (SSE) multiplexer correctly receives the new event and updates the incoming queue UI instantly.
5. **Verifies Pipeline Processing:** Confirms the `PhotosPipeline` successfully queues the photo for cloud processing.

## 4. Testing Cloud Sync (Management Hub)
To test that Master pushes to Cloudflare effectively:
1. Open `.env` in the root directory and ensure `ENABLE_CLOUD_SYNC=true`.
2. Ensure you have the `VITE_SUPABASE_URL` and keys configured if testing end-to-end all the way to the Supabase backend.
3. Run Master in development mode (`npm run dev:master`).
4. Drop a test photo into `uploads/`. The `CloudSyncService` will detect it and initiate a sync to the remote server. Observe the Master terminal logs for `[CloudSync] Success` messages.
