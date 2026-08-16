// @vitest-environment jsdom
/**
 * ClickFlash Installer — Pairing Smoke Tests
 * Mocks the IPC layer and tests runPairing states.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInstallerState } from "../hooks/useInstallerState";

// Mock the global window.installerApi
const mockApi = {
  checkPrerequisites: vi.fn(),
  openOAuth: vi.fn(),
  testCloudflareToken: vi.fn(),
  onOAuthCallback: vi.fn(() => () => {}),
  registerFleet: vi.fn(),
  runHealthChecks: vi.fn(),
  saveConfig: vi.fn(),
  launchApps: vi.fn(),
  selectPayloadBundle: vi.fn(),
  selectInstallDirectory: vi.fn(),
  installPayload: vi.fn(),
  getLogs: vi.fn(),
  discoverMasters: vi.fn(),
  scanLan: vi.fn(),
  exchangePairing: vi.fn(),
  generateKioskId: vi.fn(),
  getHardwareFingerprint: vi.fn(),
  platform: "win32",
  version: "39.8.7",
};

Object.defineProperty(globalThis, "window", {
  value: {
    installerApi: mockApi,
  },
  writable: true,
});

describe("runPairing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set error when no masters are found", async () => {
    mockApi.discoverMasters.mockResolvedValue({ success: true, masters: [] });
    mockApi.scanLan.mockResolvedValue({ success: true, masters: [] });

    const { result } = renderHook(() => useInstallerState());

    await act(async () => {
      const pairingResult = await result.current.runPairing();
      expect(pairingResult).toBeNull();
    });

    expect(result.current.state.error).toBe(
      "No Touch Kiosk found on this network. Use the QR code pairing option."
    );
    expect(result.current.state.touchPaired).toBe(false);
    expect(result.current.state.pairingResult).toBeNull();
  });

  it("should pair successfully when one master is found", async () => {
    mockApi.discoverMasters.mockResolvedValue({
      success: true,
      masters: [
        {
          desk_id: "MASTER_BALI_A1B2",
          tenant_id: "tenant-1",
          host: "192.168.1.50",
          port: 8090,
          addresses: ["192.168.1.50"],
          latencyMs: 8,
        },
      ],
    });
    mockApi.getHardwareFingerprint.mockResolvedValue({
      fingerprint: "abc123def456",
    });
    mockApi.generateKioskId.mockResolvedValue({
      kioskId: "KIOSK_BALI_A3F7",
    });
    mockApi.exchangePairing.mockResolvedValue({
      success: true,
      hmac_secret: "supersecret",
      tenant_id: "tenant-1",
      master_desk_id: "MASTER_BALI_A1B2",
      master_ip: "192.168.1.50",
      master_port: 8090,
    });

    const { result } = renderHook(() => useInstallerState());

    await act(async () => {
      const pairingResult = await result.current.runPairing();
      expect(pairingResult).not.toBeNull();
      expect(pairingResult?.paired).toBe(true);
      expect(pairingResult?.masterIp).toBe("192.168.1.50");
      expect(pairingResult?.latencyMs).toBe(8);
    });

    expect(result.current.state.touchPaired).toBe(true);
    expect(result.current.state.pairingResult?.hmacSecret).toBe("supersecret");
    expect(result.current.state.pairingResult?.kioskId).toBe("KIOSK_BALI_A3F7");
    expect(result.current.state.error).toBeNull();
  });

  it("should set error when exchange fails", async () => {
    mockApi.discoverMasters.mockResolvedValue({
      success: true,
      masters: [
        {
          desk_id: "MASTER_BALI_A1B2",
          tenant_id: "tenant-1",
          host: "192.168.1.50",
          port: 8090,
          addresses: ["192.168.1.50"],
          latencyMs: 8,
        },
      ],
    });
    mockApi.getHardwareFingerprint.mockResolvedValue({
      fingerprint: "abc123def456",
    });
    mockApi.generateKioskId.mockResolvedValue({
      kioskId: "KIOSK_BALI_A3F7",
    });
    mockApi.exchangePairing.mockResolvedValue({
      success: false,
      error: "Invalid challenge signature",
    });

    const { result } = renderHook(() => useInstallerState());

    await act(async () => {
      const pairingResult = await result.current.runPairing();
      expect(pairingResult).toBeNull();
    });

    expect(result.current.state.error).toBe("Invalid challenge signature");
    expect(result.current.state.touchPaired).toBe(false);
    expect(result.current.state.pairingResult).toBeNull();
  });
});
