import { Destination, DailyObjective, LoginHistory } from "./types";

export type ManagementContext = "global" | string; // 'global' or a specific hotel ID

export interface Hotel {
  id: string;
  name: string;
}

export const HOTELS: Hotel[] = [
  { id: "marhaba_club", name: "Marhaba Club" },
  { id: "marhaba_occidental", name: "Marhaba Occidental" },
  { id: "marhaba_concorde", name: "Concorde" },
];

export const ECOSYSTEM_CONTACTS = {
  support: "support@clickflash.com",
  hello: "hello@clickflash.com",
  admin: "admin@clickflash.com",
  hq: "hq@clickflash.com",
  resorts: {
    concorde: "concordegreenpark@clickflash.com",
    marhaba_club: "marhabaclub@clickflash.com",
    marhaba_occidental: "occidentalmarhaba@clickflash.com",
  },
};

export const BASE_CURRENCY = {
  id: "eur",
  code: "EUR",
  name: "Euro",
  symbol: "€",
  rate: 1,
};
export const AVAILABLE_CURRENCIES = [
  BASE_CURRENCY,
  { id: "usd", code: "USD", name: "US Dollar", symbol: "$", rate: 1.08 },
  { id: "tnd", code: "TND", name: "Tunisian Dinar", symbol: "DT", rate: 3.35 },
];

export const MOCK_DESTINATIONS: Destination[] = HOTELS.map((h) => ({
  id: h.id,
  name: h.name,
  location: "Tunisia",
  status: "Online",
  country: "Tunisia",
  type: "Resort",
}));

export const MOCK_PRODUCTS = [
  { id: "1", name: "Digital Single", price: 15 },
  { id: "2", name: "Digital Album", price: 85 },
  { id: "3", name: "Print 4x6", price: 10 },
];

export const MOCK_LOGIN_HISTORY: LoginHistory[] = [];
export const MOCK_OBJECTIVES: DailyObjective[] = [];

// ============================================================================
// MANAGEMENT VIEWS — 12 primary views (4 tabs)
// Tab → Dashboard, Operations, Finance, Settings
// ============================================================================

export type ManagementView =
  // Dashboard Tab
  | "executive_dashboard"

  // Operations Tab
  | "stations_overview"
  | "orders_sales"
  | "assets_inventory"
  | "sync_logs"

  // Finance Tab
  | "revenue_income"
  | "expenses_payroll"
  | "capital_treasury"

  // Settings Tab
  | "general_settings"
  | "staff_management"
  | "session_types"
  | "reports_insights";
