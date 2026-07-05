import { test, expect, _electron as electron, ElectronApplication, Page } from "@playwright/test";
import * as http from "http";
import * as path from "path";

/**
 * ClickFlash Installer — 9-step E2E smoke test
 *
 * Drives the actual Electron app:
 *   welcome → license → cloudflare (OAuth Device Code) → destination →
 *   studio → pairing → first-sync → health → complete
 *
 * The real `installerApi` (contextBridge) is invoked. Hub calls come from the
 * Electron MAIN process (Node.js fetch), so we run a local Hub mock HTTP server
 * and point CLICKFLASH_HUB_BASE at it via env var.
 */

const INSTALLER_ROOT = path.resolve(__dirname, "../../apps/installer");

let app: ElectronApplication;
let page: Page;
let hubServer: http.Server;
let hubBase: string;

function startHubMock(): Promise<string> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url || "";
      const method = req.method || "GET";
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: any = {};
        let status = 200;
        res.setHeader("Content-Type", "application/json");

        if (url.includes("/api/v1/license/validate") && method === "POST") {
          try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
          const cleaned = (body?.key || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
          // The wizard's input is `maxLength=24` of the FORMATTED string, which holds
          // 20 alphanumeric chars (5 groups × 4). Real licenses would not be limited
          // to 20 alphanumerics; this is a test mock, so we accept 20+.
          // eslint-disable-next-line no-console
          console.log(`[HUB-MOCK] license/validate key=${JSON.stringify(body?.key)} cleaned="${cleaned}" len=${cleaned.length}`);
          if (cleaned.length >= 20) {
            res.end(JSON.stringify({
              key: body.key,
              tenant_id: "tenant-test-1",
              region: "EU",
              plan: "Pro",
              features: ["multi-master", "gallery", "moneytrash"],
              max_masters: 5,
              expires_at: null,
            }));
          } else {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Invalid license key" }));
          }
          return;
        }
        if (url.includes("/api/v1/oauth/device/code") && method === "POST") {
          res.end(JSON.stringify({
            device_code: "dev_abc123",
            user_code: "WXYZ-9876",
            verification_uri: "https://hub.clickflash.app/activate",
            verification_uri_complete: "https://hub.clickflash.app/activate?code=WXYZ-9876",
            expires_in: 600,
            interval: 2,
            tenant_id: "tenant-test-1",
          }));
          return;
        }
        if (url.includes("/api/v1/oauth/token") && method === "POST") {
          res.end(JSON.stringify({
            access_token: "at_test_token_123",
            refresh_token: "rt_test_token_456",
            tenant_id: "tenant-test-1",
          }));
          return;
        }
        if (url.includes("/api/v1/fleet/check-desk-id") && method === "POST") {
          try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
          const available = !(body?.desk_id || "").includes("TAKEN");
          // eslint-disable-next-line no-console
          console.log(`[HUB-MOCK] check-desk-id desk_id=${JSON.stringify(body?.desk_id)} available=${available}`);
          res.end(JSON.stringify({
            available,
            suggestions: available ? [] : ["MASTER_BALI_2A3F", "MASTER_BALI_7B9C"],
          }));
          return;
        }
        if (url.includes("/api/v1/fleet/register") && method === "POST") {
          res.end(JSON.stringify({ status: "ok", desk_id: "MASTER_BALI_2A3F" }));
          return;
        }
        if (url.includes("/api/v1/fleet/heartbeat") && method === "POST") {
          res.end(JSON.stringify({ r2_test_ok: true }));
          return;
        }
        // Default
        res.end(JSON.stringify({ success: true }));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve(`http://127.0.0.1:${addr.port}`);
      } else {
        resolve("http://127.0.0.1:0");
      }
    });
    hubServer = server;
  });
}

test.beforeEach(async () => {
  hubBase = await startHubMock();
  app = await electron.launch({
    args: [path.join(INSTALLER_ROOT, "dist/electron/electron-main.js")],
    env: {
      ...process.env,
      NODE_ENV: "test",
      CLICKFLASH_HUB_BASE: hubBase,
    },
  });
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
});

test.afterEach(async () => {
  await app.close();
  if (hubServer) {
    await new Promise<void>((r) => hubServer.close(() => r()));
  }
});

test.describe("ClickFlash Installer — 9-step wizard", () => {
  test("Step 1: Welcome screen renders", async () => {
    await expect(page.locator("text=Welcome to ClickFlash Studio")).toBeVisible();
    await expect(page.locator("text=ClickFlash Studio Setup")).toBeVisible();
    await expect(page.locator("button:has-text('Get Started')")).toBeEnabled();
  });

  test("Full 9-step flow completes end-to-end", async () => {
    // 1. Welcome
    await expect(page.locator("text=Welcome to ClickFlash Studio")).toBeVisible();
    await page.click("button:has-text('Get Started')");

    // 2. License — formatLicenseKey splits cleaned input into 5 groups of 4 alphanumerics
    //    (20 chars), joined with 4 dashes = 24 chars total. The 24-char `maxLength` is
    //    on the formatted string, not the cleaned one. We need exactly 20 alphanumeric
    //    chars so the mock sees `cleaned.length >= 24` is FALSE — so we use a 24-char
    //    formatted input directly. Actually formatLicenseKey's validation requires
    //    `key.length < 24` to be false — but the ALPHANUMERIC count after stripping
    //    must be ≥ 24. So 20 alphanumerics is not enough; we need 24+ alphanumeric
    //    chars (6+ groups). The simplest: bypass via raw value, no — use a longer key
    //    and trust the formatter to cap at 5 groups × 4 = 20 alpha = 24 displayed.
    //
    //    Real fix: update the mock to validate on alphanumeric length.
    await expect(page.locator("text=License Key").first()).toBeVisible();
    await page.fill("input[placeholder*='CF-LIVE']", "CFLIV-EAAA-BBBB-CCCC-DDDD");
    await page.click("button:has-text('Validate')");
    await expect(page.locator("text=License Valid").first()).toBeVisible({ timeout: 15_000 });
    await page.click("button:has-text('Next')");

    // 3. Cloudflare OAuth Device Code
    await expect(page.locator("text=Cloud Account").first()).toBeVisible();
    await page.click("button:has-text('Connect')");
    // The user code appears in multiple places (display, URL, footer). Use .first().
    await expect(page.locator("text=WXYZ-9876").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForSelector("button:has-text('Next'):not([disabled])", { timeout: 15_000 });
    await page.click("button:has-text('Next')");

    // 4. Destination
    await expect(page.locator("text=Destination").first()).toBeVisible();
    await expect(page.locator("text=available").first()).toBeVisible({ timeout: 15_000 });
    await page.fill("input[placeholder*='Bali Photo Studio']", "E2E Smoke Studio");
    await page.fill("input[placeholder*='Nusa Dua']", "Bali, Indonesia");
    await page.click("button:has-text('Next')");

    // 5. Studio profile
    await expect(page.locator("text=Studio Profile").first()).toBeVisible();
    await page.click("button:has-text('Next')");

    // 6. Touch pairing
    await expect(page.locator("text=Touch Kiosk").first()).toBeVisible();
    // Pairing step may have an "Auto-Discover" button. Click it and wait.
    const autoDiscover = page.locator("button:has-text('Auto-Discover')");
    if (await autoDiscover.isVisible().catch(() => false)) {
      await autoDiscover.click();
    }
    await page.click("button:has-text('Next')", { timeout: 15_000 });

    // 7. First sync
    await expect(page.locator("text=First Sync").first()).toBeVisible();
    // Wait for the registration to complete (heartbeat + desk_id)
    await expect(page.locator("text=MASTER_BALI_2A3F")).toBeVisible({ timeout: 20_000 });
    await page.click("button:has-text('Next')");

    // 8. Health
    await expect(page.locator("text=Health Check").first()).toBeVisible();
    await page.click("button:has-text('Run Health Checks')");
    await expect(page.locator("text=Master Backend").first()).toBeVisible({ timeout: 20_000 });
    await page.click("button:has-text('Next')");

    // 9. Complete
    await expect(page.locator("text=Installation Complete").first()).toBeVisible({ timeout: 15_000 });
  });
});
