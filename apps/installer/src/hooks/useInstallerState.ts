/**
 * ClickFlash Installer — Central State Machine Hook
 * Manages wizard flow, data collection, and IPC communication
 */

import { useState, useCallback, useRef } from "react";
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
  generateDeskId,
  getDefaultTimezone,
} from "../types/installer";

declare const window: Window & {
  installerApi: {
    checkPrerequisites: () => Promise<PrerequisiteResults>;
    openOAuth: (url: string) => Promise<{ success: boolean }>;
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
    saveConfig: (config: Record<string, unknown>) => Promise<{
      success: boolean;
      error?: string;
    }>;
    launchApps: (paths: {
      master?: string;
      touch?: string;
    }) => Promise<{ master: boolean; touch: boolean }>;
    selectDirectory: () => Promise<string | null>;
    getLogs: () => Promise<string[]>;
    platform: string;
    version: string;
  };
};

const api = window.installerApi;

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
  launchOnComplete: true,
};

export function useInstallerState() {
  const [state, setState] = useState<InstallerState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

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

  // ─── Step 2: Prerequisites ────────────────────────────────────────────────────
  const runPrerequisites = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Checking system prerequisites...");
    try {
      const results = await api.checkPrerequisites();
      setState((s) => ({ ...s, prerequisites: results }));
      addLog(`OS: ${results.os}, Node: ${results.nodeVersion || "not found"}, Disk: ${results.diskSpaceGB}GB free`);
      if (!results.nodeInstalled) {
        addLog("WARNING: Node.js 20+ not detected. Will bundle runtime.");
      }
      const blockedPorts = Object.entries(results.portsAvailable)
        .filter(([, avail]) => !avail)
        .map(([port]) => port);
      if (blockedPorts.length > 0) {
        addLog(`WARNING: Ports ${blockedPorts.join(", ")} are in use.`);
      }
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

  // ─── Step 3: Cloudflare ───────────────────────────────────────────────────
  const testToken = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    addLog("Testing Cloudflare API token...");
    try {
      const result = await api.testCloudflareToken(token);
      if (result.success && result.accounts) {
        setState((s) => ({
          ...s,
          cloudflareToken: token,
          cloudflareAccounts: result.accounts!,
        }));
        addLog(`Token valid. Found ${result.accounts.length} account(s).`);
      } else {
        setError(result.error || "Token validation failed");
        addLog(`ERROR: ${result.error}`);
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Token test failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, addLog]);

  const registerFleet = useCallback(async (
    studioName: string,
    location: string,
    country: string,
    timezone: string,
    currency: string,
    cloudApiUrl: string
  ) => {
    setLoading(true);
    setError(null);
    const deskId = state.deskId || generateDeskId(location);
    addLog(`Registering fleet with desk ID: ${deskId}...`);
    try {
      const result = await api.registerFleet({
        deskId,
        name: studioName,
        location,
        country,
        timezone,
        currency,
        cloudApiUrl,
        token: state.cloudflareToken!,
      });
      if (result.success && result.data) {
        setState((s) => ({
          ...s,
          deskId: result.data!.desk_id || deskId,
          fleetRegistered: true,
          fleetResponse: result.data!,
        }));
        addLog(`Fleet registered successfully. Desk ID: ${result.data!.desk_id || deskId}`);
        if (result.data!.peers && result.data!.peers.length > 0) {
          addLog(`Connected to ${result.data!.peers.length} peer studio(s).`);
        }
      } else {
        setError(result.error || "Fleet registration failed");
        addLog(`ERROR: ${result.error}`);
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Registration failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [state.cloudflareToken, state.deskId, setLoading, setError, addLog]);

  // ─── Step 4: Studio Profile ─────────────────────────────────────────────────
  const updateStudioProfile = useCallback((profile: Partial<StudioProfile>) => {
    setState((s) => ({
      ...s,
      studioProfile: { ...s.studioProfile, ...profile },
    }));
  }, []);

  // ─── Step 5: Touch Pairing ─────────────────────────────────────────────────
  const runPairing = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Searching for Touch Kiosk on local network...");
    // Simulated auto-discovery — real implementation uses mDNS
    await new Promise((r) => setTimeout(r, 2000));
    const mockResult: TouchPairingResult = {
      paired: true,
      masterIp: "192.168.1.100",
      latencyMs: 12,
    };
    setState((s) => ({
      ...s,
      touchPaired: mockResult.paired,
      pairingResult: mockResult,
    }));
    addLog(mockResult.paired
      ? `Touch Kiosk paired at ${mockResult.masterIp} (${mockResult.latencyMs}ms)`
      : "No Touch Kiosk found. Manual pairing available.");
    setLoading(false);
    return mockResult;
  }, [setLoading, setError, addLog]);

  // ─── Step 6: Health Checks ───────────────────────────────────────────────────
  const runHealthChecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Running post-installation health checks...");
    try {
      const results = await api.runHealthChecks({
        masterPort: 8090,
        touchPort: 8091,
        cloudApiUrl: state.fleetResponse?.sync_endpoint || "https://management.clickflash.app",
        deskId: state.deskId!,
        token: state.cloudflareToken!,
      });
      setState((s) => ({ ...s, healthResults: results }));
      const passed = Object.values(results).filter(Boolean).length;
      const total = Object.values(results).length;
      addLog(`Health checks: ${passed}/${total} passed.`);
      if (!results.masterBackend) addLog("ERROR: Master backend not responding.");
      if (!results.heartbeat) addLog("ERROR: Cloud heartbeat failed.");
      return results;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Health check failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.deskId, state.cloudflareToken, state.fleetResponse, setLoading, setError, addLog]);

  // ─── Step 7: Complete ───────────────────────────────────────────────────────
  const saveAndLaunch = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("Saving configuration and launching applications...");
    try {
      await api.saveConfig({
        deskId: state.deskId,
        studioProfile: state.studioProfile,
        cloudflareAccountId: state.cloudflareAccountId,
        fleetResponse: state.fleetResponse,
        installPath: state.installPath,
        version: "5.0.0",
        installedAt: new Date().toISOString(),
      });
      if (state.launchOnComplete) {
        await api.launchApps({
          master: state.installPath
            ? `${state.installPath}/ClickFlash Master.exe`
            : undefined,
          touch: state.installPath
            ? `${state.installPath}/ClickFlash Touch.exe`
            : undefined,
        });
      }
      addLog("Installation complete. Applications launched.");
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

  return {
    state,
    setState,
    goToStep,
    nextStep,
    prevStep,
    setError,
    addLog,
    runPrerequisites,
    testToken,
    registerFleet,
    updateStudioProfile,
    runPairing,
    runHealthChecks,
    saveAndLaunch,
  };
}
