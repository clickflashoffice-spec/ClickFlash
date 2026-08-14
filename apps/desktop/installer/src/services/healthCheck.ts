/**
 * ClickFlash Installer — Health Check Service
 * Post-installation verification of all system components
 */

export interface HealthCheckConfig {
  masterPort: number;
  touchPort: number;
  cloudApiUrl: string;
  deskId: string;
  token: string;
}

export interface HealthCheckResult {
  masterBackend: boolean;
  touchBackend: boolean;
  heartbeat: boolean;
  d1Write: boolean;
  r2Upload: boolean;
  details: {
    masterBackendMs?: number;
    touchBackendMs?: number;
    heartbeatMs?: number;
    d1WriteMs?: number;
    r2UploadMs?: number;
  };
}

export async function runHealthChecks(config: HealthCheckConfig): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    masterBackend: false,
    touchBackend: false,
    heartbeat: false,
    d1Write: false,
    r2Upload: false,
    details: {},
  };

  // 1. Master backend health
  try {
    const start = Date.now();
    const res = await fetchWithTimeout(`http://localhost:${config.masterPort}/api/health`, 5000);
    result.masterBackend = res.ok;
    result.details.masterBackendMs = Date.now() - start;
  } catch {
    result.masterBackend = false;
  }

  // 2. Touch backend health
  try {
    const start = Date.now();
    const res = await fetchWithTimeout(`http://localhost:${config.touchPort}/api/health`, 5000);
    result.touchBackend = res.ok;
    result.details.touchBackendMs = Date.now() - start;
  } catch {
    result.touchBackend = false;
  }

  // 3. Cloud heartbeat
  try {
    const start = Date.now();
    const res = await fetch(`${config.cloudApiUrl}/api/masters/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        desk_id: config.deskId,
        status: "Online",
        timestamp: new Date().toISOString(),
      }),
    });
    result.heartbeat = res.ok;
    result.details.heartbeatMs = Date.now() - start;
  } catch {
    result.heartbeat = false;
  }

  // 4. D1 write test (via Management Hub)
  try {
    const start = Date.now();
    const res = await fetch(`${config.cloudApiUrl}/api/cloud/sync/test-d1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ desk_id: config.deskId }),
    });
    result.d1Write = res.ok;
    result.details.d1WriteMs = Date.now() - start;
  } catch {
    result.d1Write = false;
  }

  // 5. R2 upload test
  try {
    const start = Date.now();
    // Generate 1MB test payload
    const testData = new Uint8Array(1024 * 1024);
    crypto.getRandomValues(testData);
    const res = await fetch(`${config.cloudApiUrl}/api/cloud/sync/test-r2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        Authorization: `Bearer ${config.token}`,
        "X-Desk-Id": config.deskId,
      },
      body: testData,
    });
    result.r2Upload = res.ok;
    result.details.r2UploadMs = Date.now() - start;
  } catch {
    result.r2Upload = false;
  }

  return result;
}

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    fetch(url, { signal: controller.signal })
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}
