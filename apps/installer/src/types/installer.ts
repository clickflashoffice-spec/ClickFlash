/**
 * ClickFlash Installer — Shared TypeScript Types
 */

export type InstallStep =
  | "welcome"
  | "prerequisites"
  | "cloudflare"
  | "studio"
  | "pairing"
  | "health"
  | "complete";

export interface PrerequisiteResults {
  nodeVersion: string | null;
  nodeInstalled: boolean;
  diskSpaceGB: number;
  portsAvailable: Record<number, boolean>;
  os: string;
  arch: string;
  totalMemoryGB: number;
}

export interface CloudflareAccount {
  id: string;
  name: string;
}

export interface FleetRegistrationPayload {
  deskId: string;
  name: string;
  location: string;
  country: string;
  timezone: string;
  currency: string;
  cloudApiUrl: string;
  token: string;
}

export interface FleetRegistrationResponse {
  status: string;
  desk_id: string;
  shared_config?: {
    products: unknown[];
    session_types: unknown[];
    pricing_tiers: unknown[];
    global_settings: Record<string, string>;
  };
  peers?: Array<{
    desk_id: string;
    name: string;
    location: string;
    status: "Online" | "Offline";
    last_seen: string;
  }>;
  r2_prefix?: string;
  sync_endpoint?: string;
  gallery_endpoint?: string;
  jwt_token?: string;
}

export interface StudioProfile {
  studioName: string;
  location: string;
  timezone: string;
  currency: string;
}

export interface TouchPairingResult {
  paired: boolean;
  masterIp: string | null;
  latencyMs: number | null;
  error?: string;
}

export interface HealthCheckResults {
  masterBackend: boolean;
  touchBackend: boolean;
  heartbeat: boolean;
  d1Write: boolean;
  r2Upload: boolean;
}

export interface InstallerState {
  step: InstallStep;
  stepIndex: number;
  totalSteps: number;
  isLoading: boolean;
  error: string | null;
  logs: string[];

  // Prerequisites
  prerequisites: PrerequisiteResults | null;

  // Cloudflare
  cloudflareToken: string | null;
  cloudflareAccountId: string | null;
  cloudflareAccounts: CloudflareAccount[];
  deskId: string | null;
  fleetRegistered: boolean;
  fleetResponse: FleetRegistrationResponse | null;

  // Studio
  studioProfile: StudioProfile;

  // Pairing
  touchPaired: boolean;
  pairingResult: TouchPairingResult | null;

  // Health
  healthResults: HealthCheckResults | null;

  // Completion
  installPath: string;
  launchOnComplete: boolean;
}

export const STEP_ORDER: InstallStep[] = [
  "welcome",
  "prerequisites",
  "cloudflare",
  "studio",
  "pairing",
  "health",
  "complete",
];

export const STEP_LABELS: Record<InstallStep, string> = {
  welcome: "Welcome",
  prerequisites: "System Check",
  cloudflare: "Cloud Account",
  studio: "Studio Profile",
  pairing: "Kiosk Pairing",
  health: "Health Check",
  complete: "Complete",
};

export function generateDeskId(location?: string): string {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  if (location) {
    const clean = location.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
    return `MASTER_${clean}_${rand}`;
  }
  return `MASTER_${rand}`;
}

export function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
];
