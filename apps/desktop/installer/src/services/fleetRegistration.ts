/**
 * ClickFlash Installer — Fleet Registration Service
 * Registers a new master station in the global multi-master fleet
 */

export interface FleetRegisterPayload {
  deskId: string;
  name: string;
  location: string;
  country: string;
  timezone: string;
  currency: string;
  hardwareFingerprint: string;
  version: string;
}

export interface FleetRegisterResult {
  success: boolean;
  deskId?: string;
  jwtToken?: string;
  peers?: Array<{
    desk_id: string;
    name: string;
    location: string;
    status: "Online" | "Offline";
    last_seen: string;
  }>;
  sharedConfig?: {
    products: unknown[];
    session_types: unknown[];
    pricing_tiers: unknown[];
    global_settings: Record<string, string>;
  };
  r2Prefix?: string;
  syncEndpoint?: string;
  galleryEndpoint?: string;
  error?: string;
}

export async function registerWithFleet(
  cloudApiUrl: string,
  token: string,
  payload: FleetRegisterPayload
): Promise<FleetRegisterResult> {
  try {
    const res = await fetch(`${cloudApiUrl}/api/masters/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        desk_id: payload.deskId,
        name: payload.name,
        location: payload.location,
        country: payload.country,
        timezone: payload.timezone,
        currency: payload.currency,
        hardware_fingerprint: payload.hardwareFingerprint,
        version: payload.version,
      }),
    });

    const data = (await res.json()) as {
      status?: string;
      desk_id?: string;
      jwt_token?: string;
      peers?: FleetRegisterResult["peers"];
      shared_config?: FleetRegisterResult["sharedConfig"];
      r2_prefix?: string;
      sync_endpoint?: string;
      gallery_endpoint?: string;
      error?: string;
    };

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      deskId: data.desk_id || payload.deskId,
      jwtToken: data.jwt_token,
      peers: data.peers,
      sharedConfig: data.shared_config,
      r2Prefix: data.r2_prefix,
      syncEndpoint: data.sync_endpoint,
      galleryEndpoint: data.gallery_endpoint,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkDeskIdAvailability(
  cloudApiUrl: string,
  token: string,
  deskId: string
): Promise<{ available: boolean; existing?: string[]; error?: string }> {
  try {
    const res = await fetch(`${cloudApiUrl}/api/masters/check-desk-id?desk_id=${encodeURIComponent(deskId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { available: boolean; existing?: string[]; error?: string };
    return data;
  } catch (err: unknown) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
