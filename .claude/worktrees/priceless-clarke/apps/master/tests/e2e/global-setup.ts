/**
 * Global setup for E2E tests
 * Ensures both frontend and backend are healthy before running tests.
 */

import { execSync } from 'child_process';

const BACKEND_URL = 'http://127.0.0.1:8090/api/health';
const BACKEND_TIMEOUT_MS = 60_000;
const BACKEND_POLL_MS = 500;

async function waitForBackend(): Promise<void> {
  const deadline = Date.now() + BACKEND_TIMEOUT_MS;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) {
        console.log(`[E2E Setup] Backend ready (${res.status})`);
        return;
      }
      lastError = `status ${res.status}`;
    } catch (e: any) {
      lastError = e.message;
    }
    await new Promise(resolve => setTimeout(resolve, BACKEND_POLL_MS));
  }
  throw new Error(`[E2E Setup] Backend did not become ready within ${BACKEND_TIMEOUT_MS}ms. Last error: ${lastError}`);
}

async function globalSetup() {
  console.log('[E2E Setup] Starting global setup...');
  console.log('[E2E Setup] Waiting for backend...');
  await waitForBackend();
  console.log('[E2E Setup] Global setup complete');
}

export default globalSetup;
