/**
 * ClickFlash Installer — Central State Machine Hook
 * Manages 9-step wizard flow: welcome → license → cloudflare → destination → studio → pairing → first-sync → health → complete
 */

import { useState, useCallback, useRef } from "react";
import type {
  ApplicationComponent,
  HeartbeatPayload,
  InstallerConfig,
  LaunchAppsPayload,
  RegisterWithHubPayload,
  ValidatedLicense,
  WriteEnvConfigPayload,
} from "../../installer-ipc-schemas";
import type { PayloadBundleSelectionResult } from "../../installer-payload-verification";
import {
  InstallStep,
  STEP_ORDER,
  InstallerState,
  PrerequisiteResults,
  CloudflareAccount,
  FleetRegistrationPayload,
  FleetRegistrationResponse,
  StudioProfile,
  TouchPairingResult,
  HealthCheckResults,
  getDefaultTimezone,
} from "../types/installer";

declare const window: Window & {
  installerApi: {
    checkPrerequisites: () => Promise<PrerequisiteResults>;
    openOAuth: (url: string) => Promise<{ success: boolean; error?: string }>;
    testCloudflareToken: (token: string) => Promise<{
      success: boolean;
      accounts?: CloudflareAccount[];
      error?: string;
    }>;
    onOAuthCallback: (cb: (data: { token: string }) => void) => () => void;
    registerFleet: (payload: FleetRegistrationPayload) => Promise<{
      success: boolean;
      data?: FleetRegistrationResponse;
      error?: string;
    }>;
    runHealthChecks: (config: {
      masterPort: number;
      touchPort: number;
      cloudApiUrl: string;
      deskId: string;
      token: string;
    }) => Promise<HealthCheckResults>;
    saveConfig: (config: InstallerConfig) => Promise<{
      success: boolean;
      error?: string;
    }>;
    writeEnvConfig: (params: WriteEnvConfigPayload) => Promise<{ success: boolean; error?: string }>;
    getGeolocation: () => Promise<{ success: boolean; data?: { city: string; regionName: string; countryCode?: string; country?: string; timezone: string; currency?: string }; error?: string }>;
    launchApps: (payload: LaunchAppsPayload) => Promise<{ master: boolean; touch: boolean }>;
    selectPayloadBundle: () => Promise<PayloadBundleSelectionResult>;
    getLogs: () => Promise<string[]>;
    // License
    validateLicense: (key: string) => Promise<{ success: boolean; data?: ValidatedLicense; error?: string }>;
    // OAuth Device Code
    requestDeviceCode: () => Promise<{ success: boolean; data?: { device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval: number; tenant_id?: string }; error?: string }>;
    pollForToken: (deviceCode: string) => Promise<{ success: boolean; data?: { access_token?: string; refresh_token?: string; tenant_id?: string; error?: string; error_description?: string }; error?: string; status?: number }>;
    // Desk ID
    checkDeskId: (deskId: string) => Promise<{ success: boolean; data?: { available: boolean; suggestions?: string[] }; error?: string }>;
    // Hub Registration
    registerWithHub: (payload: RegisterWithHubPayload) => Promise<{ success: boolean; data?: { desk_id: string }; error?: string }>;
    sendHeartbeat: (payload: HeartbeatPayload) => Promise<{ success: boolean; data?: { r2_test_ok?: boolean }; error?: string }>;
    openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
    // Pairing
    discoverMasters: () => Promise<{ success: boolean; masters: Array<{ desk_id: string; tenant_id: string; host: string; port: number; addresses: string[]; latencyMs: number }> }>;
    scanLan: () => Promise<{ success: boolean; masters: Array<{ desk_id: string; tenant_id: string; host: string; port: number; addresses: string[]; latencyMs: number }> }>;
    exchangePairing: (params: {
      masterHost: string;
      masterPort: number;
      masterDeskId: string;
      kioskId: string;
      hardwareFingerprint: string;
    }) => Promise<{
      success: boolean;
      hmac_secret?: string;
      tenant_id?: string;
      master_desk_id?: string;
      master_ip?: string;
      master_port?: number;
      error?: string;
    }>;
    generateKioskId: (hardwareFingerprint: string) => Promise<{ kioskId: string }>;
    getHardwareFingerprint: () => Promise<{ fingerprint: string }>;
    // Platform
    platform: string;
    version: string;
  };
};

// Resolve the installer API lazily so tests can inject window.installerApi
// after the module is imported.
const api = new Proxy({} as typeof window.installerApi, {
  get(_target, prop) {
    const installerApi = (window as unknown as { installerApi: typeof window.installerApi }).installerApi;
    const value = installerApi[prop as keyof typeof window.installerApi];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(installerApi) : value;
  },
});

const initialState: InstallerState = {
  step: "welcome",
  stepIndex: 0,
  totalSteps: STEP_ORDER.length,
  isLoading: false,
  error: null,
  logs: [],
  prerequisites: null,
  cloudflareToken: null,
  cloudflareAccountId: null,
  cloudflareAccounts: [],
  deskId: null,
  fleetRegistered: false,
  fleetResponse: null,
  studioProfile: {
    studioName: "",
    location: "",
    timezone: getDefaultTimezone(),
    currency: "USD",
  },
  touchPaired: false,
  pairingResult: null,
  healthResults: null,
  installPath: "",
  payloadBundle: null,
  launchOnComplete: true,
  license: null,
  hub: null,
  desk: null,
  pairings: [],
  firstSync: null,
  selectedApps: ["master", "touch", "auto-editor", "sync-service", "management"],
};

export function useInstallerState() {
  const [state, setState] = useState<InstallerState>(initialState);
  const pollAbortRef = useRef<AbortController | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setState((s) => ({ ...s, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((s) => ({ ...s, error }));
  }, []);

  const addLog = useCallback((message: string) => {
    setState((s) => ({ ...s, logs: [...s.logs.slice(-99), message] }));
  }, []);

  const goToStep = useCallback((step: InstallStep) => {
    const index = STEP_ORDER.indexOf(step);
    setState((s) => ({ ...s, step, stepIndex: index, error: null }));
  }, []);

  const nextStep = useCallback(() => {
    setState((s) => {
      const next = Math.min(s.stepIndex + 1, STEP_ORDER.length - 1);
      return { ...s, step: STEP_ORDER[next], stepIndex: next, error: null };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((s) => {
      const prev = Math.max(s.stepIndex - 1, 0);
      return { ...s, step: STEP_ORDER[prev], stepIndex: prev, error: null };
    });
  }, []);

  const setSelectedApps = useCallback((apps: ApplicationComponent[]) => {
    setState((s) => ({ ...s, selectedApps: apps }));
  }, []);

  const selectPayloadBundle = useCallback(async () => {
    setError(null);
    try {
      const result = await api.selectPayloadBundle();
      if (result.success) {
        setState((s) => ({
          ...s,
          installPath: result.directory,
          payloadBundle: result.summary,
        }));
        addLog(`Signed payload ${result.summary.releaseId} v${result.summary.version} verified.`);
        return result.directory;
      }
      if (!result.canceled) {
        setState((s) => ({ ...s, installPath: "", payloadBundle: null }));
        setError(result.error || "Payload bundle verification failed");
        addLog(`ERROR: ${result.error || "Payload bundle verification failed"}`);
      }
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, installPath: "", payloadBundle: null }));
      setError(`Payload bundle verification failed: ${message}`);
      addLog(`ERROR: ${message}`);
      return null;
    }
  }, [addLog, setError]);

  const setLaunchOnComplete = useCallback((launchOnComplete: boolean) => {
    setState((s) => ({ ...s, launchOnComplete }));
  }, []);

  // ─── Step 1: Prerequisites ───────────────────────────────────────────────────
  const runPrerequisites = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Checking system prerequisites...");
    try {
      const results = await api.checkPrerequisites();
      setState((s) => ({ ...s, prerequisites: results }));
      addLog(`OS: ${results.os}, Node: ${results.nodeVersion || "not found"}, Disk: ${results.diskSpaceGB}GB free`);
      if (!results.nodeInstalled) addLog("WARNING: Node.js 20+ not detected.");
      return results;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Prerequisite check failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, addLog]);

  // ─── Step 2: License ────────────────────────────────────────────────────────
  const validateLicense = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    addLog("Validating license key...");
    try {
      const result = await api.validateLicense(key);
      if (result.success && result.data) {
        setState((s) => ({ ...s, license: result.data! }));
        addLog(`License valid. Plan: ${result.data.plan}, Max Studios: ${result.data.max_masters}`);
      } else {
        setError(result.error || "License validation failed");
        addLog(`ERROR: ${result.error}`);
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`License validation failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, addLog]);

  // ─── Step 3: Cloudflare (OAuth Device Code) ────────────────────────────────
  const requestDeviceCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Requesting device code from Hub...");
    try {
      const result = await api.requestDeviceCode();
      if (result.success && result.data) {
        const d = result.data;
        setState((s) => ({
          ...s,
          hub: {
            device_code: d.device_code,
            user_code: d.user_code,
            verification_uri: d.verification_uri_complete || d.verification_uri,
            expires_at: Date.now() + d.expires_in * 1000,
            interval: d.interval || 5,
            tenant_id: d.tenant_id,
          },
        }));
        addLog(`User code: ${d.user_code}. Visit ${d.verification_uri} to authorize.`);
      } else {
        setError(result.error || "Failed to request device code");
        addLog(`ERROR: ${result.error}`);
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Device code request failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, addLog]);

  const pollForToken = useCallback(async (deviceCode: string, intervalMs: number) => {
    addLog(`Polling Hub for authorization (every ${intervalMs / 1000}s)...`);
    pollAbortRef.current = new AbortController();

    const poll = async (): Promise<{ success: boolean; data?: { access_token?: string; refresh_token?: string; tenant_id?: string; error?: string; error_description?: string }; error?: string; status?: number }> => {
      const res = await api.pollForToken(deviceCode);
      return res;
    };

    return new Promise<{ success: boolean; data?: unknown; error?: string; status?: number }>((resolve) => {
      const tick = async () => {
        if (pollAbortRef.current?.signal.aborted) {
          resolve({ success: false, error: "aborted" });
          return;
        }
        const res = await poll();
        if (res.success && res.data?.access_token) {
          setState((s) => ({
            ...s,
            hub: s.hub ? {
              ...s.hub,
              access_token: res.data!.access_token!,
              refresh_token: res.data!.refresh_token,
              tenant_id: res.data!.tenant_id || s.hub.tenant_id,
            } : s.hub,
          }));
          addLog(`✓ Authorized. Tenant: ${res.data.tenant_id}`);
          resolve({ success: true, data: res.data });
        } else if (res.data?.error === "authorization_pending") {
          // keep polling
        } else if (res.data?.error === "slow_down") {
          intervalMs += 5000;
        } else if (res.data?.error === "expired_token") {
          resolve({ success: false, error: "expired_token" });
        } else {
          // Network or unknown error
          resolve({ success: false, error: res.error || res.data?.error_description || "Unknown" });
        }
      };
      void tick();
      const id = setInterval(tick, intervalMs);
      // Stop after 5 minutes max
      setTimeout(() => {
        clearInterval(id);
        resolve({ success: false, error: "timeout" });
      }, 5 * 60 * 1000);
    });
  }, [addLog]);

  // ─── Step 4: Destination ────────────────────────────────────────────────────
  const checkDeskId = useCallback(async (deskId: string) => {
    return await api.checkDeskId(deskId);
  }, []);

  const setDestination = useCallback((profile: { proposed_id: string; site_code: string; name: string; location: string; country: string; timezone: string; currency: string }) => {
    setState((s) => ({
      ...s,
      desk: { ...profile, confirmed_id: profile.proposed_id },
      studioProfile: {
        studioName: profile.name,
        location: profile.location,
        timezone: profile.timezone,
        currency: profile.currency,
      },
      deskId: profile.proposed_id,
    }));
    addLog(`Destination set: ${profile.proposed_id} (${profile.location}, ${profile.country})`);
  }, [addLog]);

  // ─── Step 5: Studio Profile (extended) ──────────────────────────────────────
  const updateStudioProfile = useCallback((profile: Partial<StudioProfile>) => {
    setState((s) => ({
      ...s,
      studioProfile: { ...s.studioProfile, ...profile },
    }));
  }, []);

  // ─── Step 6: Touch Pairing (real mDNS+LAN) ───────────────────────────────────
  const runPairing = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Searching for Touch Kiosk on local network...");
    try {
      // Step 1: try mDNS
      const mdnsRes = await api.discoverMasters();
      let masters: Array<{ desk_id: string; host: string; port: number; latencyMs: number }> = (mdnsRes.masters || []) as Array<{ desk_id: string; host: string; port: number; latencyMs: number }>;

      if (masters.length === 0) {
        addLog("mDNS found no Masters; trying LAN sweep...");
        const lanRes = await api.scanLan();
        masters = (lanRes.masters || []) as Array<{ desk_id: string; host: string; port: number; latencyMs: number }>;
      }

      if (masters.length === 0) {
        setError("No Touch Kiosk found on this network. Use the QR code pairing option.");
        setLoading(false);
        return null;
      }

      // Step 2: rank by latency
      const ranked = masters.slice().sort((a, b) => a.latencyMs - b.latencyMs);
      const master = ranked[0];
      addLog(`Found ${masters.length} Touch Kiosk(s); pairing with ${master.desk_id} (${master.latencyMs}ms)`);

      // Step 3: exchange
      const hardwareRes = await api.getHardwareFingerprint();
      const kioskIdRes = await api.generateKioskId(hardwareRes.fingerprint);
      const exchange = await api.exchangePairing({
        masterHost: master.host,
        masterPort: master.port,
        masterDeskId: master.desk_id,
        kioskId: kioskIdRes.kioskId,
        hardwareFingerprint: hardwareRes.fingerprint,
      });

      if (!exchange.success) {
        setError(exchange.error || "Pairing exchange failed");
        setLoading(false);
        return null;
      }

      const pairing: TouchPairingResult = {
        paired: true,
        masterIp: master.host,
        latencyMs: master.latencyMs,
        hmacSecret: exchange.hmac_secret || null,
        tenantId: exchange.tenant_id || null,
        kioskId: kioskIdRes.kioskId,
        hardwareFingerprint: hardwareRes.fingerprint,
      };
      setState((s) => ({
        ...s,
        touchPaired: true,
        pairingResult: pairing,
        pairings: [
          { kiosk_id: kioskIdRes.kioskId, mac: "unknown", method: "mdns", paired_at: Math.floor(Date.now() / 1000) },
          ...s.pairings,
        ],
      }));
      addLog(`✓ Touch paired with ${exchange.master_desk_id} on ${master.host}`);
      setLoading(false);
      return pairing;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Pairing failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      setLoading(false);
      return null;
    }
  }, [setLoading, setError, addLog]);

  // ─── Step 7: First Sync (register + heartbeat + r2 test) ───────────────────
  const registerAndFirstSync = useCallback(async () => {
    const hub = state.hub;
    const desk = state.desk;
    const deskId = state.deskId;
    if (!hub?.access_token) {
      return { success: false, error: "Not authorized. Please complete the Cloud Account step." };
    }
    if (!deskId || !desk) {
      return { success: false, error: "Destination profile is incomplete." };
    }
    setLoading(true);
    setError(null);
    addLog("Registering with Hub...");
    try {
      const regRes = await api.registerWithHub({
        desk_id: deskId,
        site_code: desk.site_code,
        name: desk.name,
        location: desk.location,
        country: desk.country,
        timezone: desk.timezone,
        currency: desk.currency,
        hardware_fingerprint: (await api.getHardwareFingerprint()).fingerprint,
        version: "5.0.0",
        mode: "install",
        access_token: hub.access_token,
      });
      if (!regRes.success) {
        setLoading(false);
        return { success: false, error: regRes.error || "Registration failed" };
      }
      addLog(`Registered as ${regRes.data?.desk_id}`);

      // First heartbeat
      addLog("Sending first heartbeat...");
      const hbRes = await api.sendHeartbeat({
        desk_id: deskId,
        status: "Online",
        version: "5.0.0",
        access_token: hub.access_token,
        test_r2: true,
      });
      if (!hbRes.success) {
        setLoading(false);
        return { success: false, error: hbRes.error || "Heartbeat failed" };
      }
      addLog(`Heartbeat OK. R2 test: ${hbRes.data?.r2_test_ok ? "✓" : "✗"}`);

      setState((s) => ({
        ...s,
        fleetRegistered: true,
        firstSync: { registered_at: Date.now(), heartbeat_ok: true, r2_test_ok: !!hbRes.data?.r2_test_ok },
      }));
      setLoading(false);
      return { success: true, data: { desk_id: regRes.data?.desk_id || deskId, r2_test_ok: !!hbRes.data?.r2_test_ok } };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`First sync failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      setLoading(false);
      return { success: false, error: msg };
    }
  }, [state.hub, state.deskId, state.desk, setLoading, setError, addLog]);

  // ─── Step 8: Health Checks ───────────────────────────────────────────────────
  const runHealthChecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Running post-installation health checks...");
    try {
      const results = await api.runHealthChecks({
        masterPort: 8090,
        touchPort: 8091,
        cloudApiUrl: "https://hub.clickflash.app",
        deskId: state.deskId!,
        token: state.hub?.access_token || "",
      });
      setState((s) => ({ ...s, healthResults: results }));
      const passed = Object.values(results).filter(Boolean).length;
      const total = Object.values(results).length;
      addLog(`Health checks: ${passed}/${total} passed.`);
      return results;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Health check failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.deskId, state.hub, setLoading, setError, addLog]);

  // ─── Step 9: Complete ───────────────────────────────────────────────────────
  const saveAndLaunch = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Committing application configuration...");
    try {
      if (!state.deskId || !state.desk || !state.license) {
        throw new Error("License and destination configuration must be complete");
      }
      if (!state.installPath) {
        throw new Error("An approved deployment root is required");
      }
      const configResult = await api.saveConfig({
        deskId: state.deskId,
        studioProfile: state.studioProfile,
        destination: state.desk,
        license: state.license,
        hub: state.hub ? { tenant_id: state.hub.tenant_id } : null,
        pairings: state.pairings,
        firstSync: state.firstSync,
        version: "5.0.0",
        installedAt: new Date().toISOString(),
      });
      if (!configResult.success) {
        throw new Error(configResult.error || "Failed to save installer configuration");
      }

      const envConfigResult = await api.writeEnvConfig({
        targetDir: state.installPath,
        selectedApps: state.selectedApps,
        deskId: state.deskId,
        siteCode: state.desk.site_code,
        tenantId: state.hub?.tenant_id || null,
        timezone: state.desk.timezone,
        location: state.desk.location,
        currency: state.desk.currency,
      });
      if (!envConfigResult.success) {
        throw new Error(envConfigResult.error || "Application configuration failed");
      }

      if (state.launchOnComplete) {
        const components = state.selectedApps.filter(
          (application): application is "master" | "touch" => application === "master" || application === "touch",
        );
        const launchResult = await api.launchApps({ components });
        const failedApplications = components.filter((application) => !launchResult[application]);
        if (failedApplications.length > 0) {
          throw new Error(`Failed to launch: ${failedApplications.join(", ")}`);
        }
      }
      addLog(state.launchOnComplete
        ? "Configuration committed. Applications launched."
        : "Configuration committed successfully.");
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Launch failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [state, setLoading, setError, addLog]);

  const openExternal = useCallback((url: string) => api.openExternalUrl(url).then(() => undefined), []);

  return {
    state,
    setState,
    goToStep,
    nextStep,
    prevStep,
    setSelectedApps,
    selectPayloadBundle,
    setLaunchOnComplete,
    setError,
    addLog,
    runPrerequisites,
    validateLicense,
    requestDeviceCode,
    pollForToken,
    checkDeskId,
    setDestination,
    updateStudioProfile,
    runPairing,
    registerAndFirstSync,
    runHealthChecks,
    saveAndLaunch,
    openExternal,
  };
}
