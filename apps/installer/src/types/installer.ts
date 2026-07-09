/**
 * ClickFlash Installer — Shared TypeScript Types
 */

export type InstallStep =
  | "welcome"
  | "app-selection"
  | "license"
  | "cloudflare"
  | "destination"
  | "studio"
  | "pairing"
  | "first-sync"
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
  hmacSecret?: string | null;
  tenantId?: string | null;
  kioskId?: string | null;
  hardwareFingerprint?: string | null;
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
  selectedApps?: string[];

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

  // License
  license: { key: string; tenant_id: string; region: string; plan: string; features: string[]; max_masters: number; expires_at: string | null } | null;

  // Cloudflare (OAuth)
  hub: { device_code: string; user_code: string; verification_uri: string; expires_at: number; access_token?: string; refresh_token?: string; tenant_id?: string; interval: number } | null;

  // Destination
  desk: { proposed_id: string; confirmed_id?: string; name: string; location: string; country: string; timezone: string; currency: string } | null;

  // Pairing (extend existing)
  pairings: Array<{ kiosk_id: string; mac: string; method: "mdns" | "sweep" | "qr"; paired_at: number }>;

  // First sync
  firstSync: { registered_at?: number; heartbeat_ok: boolean; r2_test_ok: boolean } | null;
}

export const STEP_ORDER: InstallStep[] = [
  "welcome",
  "app-selection",
  "license",
  "cloudflare",
  "destination",
  "studio",
  "pairing",
  "first-sync",
  "health",
  "complete",
];

export const STEP_LABELS: Record<InstallStep, string> = {
  welcome: "Welcome",
  "app-selection": "Components",
  license: "License Key",
  cloudflare: "Cloud Account",
  destination: "Destination",
  studio: "Studio Profile",
  pairing: "Kiosk Pairing",
  "first-sync": "First Sync",
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

export const ISO_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "CY", name: "Cyprus" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "VN", name: "Vietnam" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "PE", name: "Peru" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" },
  { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" },
  { code: "JO", name: "Jordan" },
  { code: "LB", name: "Lebanon" },
  { code: "TR", name: "Turkey" },
  { code: "IL", name: "Israel" },
  { code: "NZ", name: "New Zealand" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
  { code: "BY", name: "Belarus" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "GE", name: "Georgia" },
  { code: "AM", name: "Armenia" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "MD", name: "Moldova" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TM", name: "Turkmenistan" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "MN", name: "Mongolia" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "LK", name: "Sri Lanka" },
  { code: "NP", name: "Nepal" },
  { code: "MM", name: "Myanmar" },
  { code: "KH", name: "Cambodia" },
  { code: "LA", name: "Laos" },
  { code: "BN", name: "Brunei" },
  { code: "MO", name: "Macau" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "MO", name: "Macau" },
  { code: "IS", name: "Iceland" },
  { code: "LI", name: "Liechtenstein" },
  { code: "MC", name: "Monaco" },
  { code: "SM", name: "San Marino" },
  { code: "AD", name: "Andorra" },
  { code: "VA", name: "Vatican City" },
  { code: "ME", name: "Montenegro" },
  { code: "MK", name: "North Macedonia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "RS", name: "Serbia" },
  { code: "XK", name: "Kosovo" },
  { code: "AL", name: "Albania" },
  { code: "MA", name: "Morocco" },
  { code: "TN", name: "Tunisia" },
  { code: "DZ", name: "Algeria" },
  { code: "LY", name: "Libya" },
  { code: "SD", name: "Sudan" },
  { code: "ET", name: "Ethiopia" },
  { code: "KE", name: "Kenya" },
  { code: "TZ", name: "Tanzania" },
  { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" },
  { code: "BI", name: "Burundi" },
  { code: "MZ", name: "Mozambique" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "BW", name: "Botswana" },
  { code: "NA", name: "Namibia" },
  { code: "AO", name: "Angola" },
  { code: "CD", name: "DR Congo" },
  { code: "CG", name: "Congo" },
  { code: "GA", name: "Gabon" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "CM", name: "Cameroon" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "NE", name: "Niger" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "SN", name: "Senegal" },
  { code: "GM", name: "Gambia" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GN", name: "Guinea" },
  { code: "SL", name: "Sierra Leone" },
  { code: "LR", name: "Liberia" },
  { code: "CI", name: "Ivory Coast" },
  { code: "GH", name: "Ghana" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Benin" },
  { code: "NG", name: "Nigeria" },
  { code: "MR", name: "Mauritania" },
  { code: "EH", name: "Western Sahara" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "CV", name: "Cape Verde" },
  { code: "SC", name: "Seychelles" },
  { code: "MU", name: "Mauritius" },
  { code: "MG", name: "Madagascar" },
  { code: "KM", name: "Comoros" },
  { code: "DJ", name: "Djibouti" },
  { code: "ER", name: "Eritrea" },
  { code: "SO", name: "Somalia" },
  { code: "SS", name: "South Sudan" },
  { code: "MW", name: "Malawi" },
  { code: "LS", name: "Lesotho" },
  { code: "SZ", name: "Eswatini" },
  { code: "GM", name: "Gambia" },
];

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
