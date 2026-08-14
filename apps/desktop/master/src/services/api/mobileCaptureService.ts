import { pb } from "../pb";

export interface MobileCapturePairingCode {
  token: string;
  expiresAt: number;
  masterId: string;
  protocol: "CF-PAIR-V1";
  photographerId: string;
  photographerName: string;
  tlsFingerprint: string;
}

export interface MobileCapturePhotographer {
  id: string;
  name: string;
  role: string;
}

export interface MobileCaptureDevice {
  deviceId: string;
  displayName: string;
  masterId: string;
  photographerId: string | null;
  photographerName: string | null;
  pairedAt: number;
  lastSeenAt: number | null;
  revokedAt: number | null;
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "Mobile capture request failed."
    );
  }
  return body as T;
}

export const mobileCaptureService = {
  async listPhotographers(): Promise<MobileCapturePhotographer[]> {
    const response = await pb.request("/api/mobile-capture/photographers");
    const body = await responseJson<{
      photographers: MobileCapturePhotographer[];
    }>(response);
    return body.photographers;
  },

  async createPairingCode(
    photographerId: string
  ): Promise<MobileCapturePairingCode> {
    const response = await pb.request("/api/mobile-capture/pairing-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photographerId }),
    });
    return responseJson<MobileCapturePairingCode>(response);
  },

  async listDevices(): Promise<MobileCaptureDevice[]> {
    const response = await pb.request("/api/mobile-capture/devices");
    const body = await responseJson<{ devices: MobileCaptureDevice[] }>(response);
    return body.devices;
  },

  async revokeDevice(deviceId: string): Promise<void> {
    const response = await pb.request(
      `/api/mobile-capture/devices/${encodeURIComponent(deviceId)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        typeof body?.error === "string" ? body.error : "Device revocation failed."
      );
    }
  },
};
