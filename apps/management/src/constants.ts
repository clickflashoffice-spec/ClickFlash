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
// Legacy views are handled by LEGACY_VIEW_MAP redirect below.
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

// ============================================================================
// LEGACY VIEW MAPPING - Maps old view names to new simplified views
// ============================================================================
// Use this map to redirect legacy views to their new simplified equivalents
// TODO: Remove legacy views and this map after full migration
// ============================================================================
export const LEGACY_VIEW_MAP: Record<string, ManagementView> = {
  // Dashboard legacy views -> executive_dashboard
  hub_dashboard: "executive_dashboard",
  command_center: "executive_dashboard",
  resort_dashboard: "executive_dashboard",
  multi_master_dashboard: "executive_dashboard",
  unified_master_dashboard: "executive_dashboard",
  analytics: "executive_dashboard",
  station_dashboard: "stations_overview",

  // Operations legacy views
  fleet_management: "stations_overview",
  orders: "orders_sales",
  money_trash: "orders_sales",
  products: "orders_sales",
  warehouse: "assets_inventory",
  assets: "assets_inventory",
  triage: "assets_inventory",

  // Finance legacy views
  income_tracking: "revenue_income",
  yield: "revenue_income",
  expenses: "expenses_payroll",
  payroll: "expenses_payroll",
  bonuses: "expenses_payroll",
  adjustments: "expenses_payroll",
  capital: "capital_treasury",
  treasury: "capital_treasury",

  // Settings legacy views
  system_config: "general_settings",
  user_management: "staff_management",
  hr: "staff_management",
  session_types: "session_types",
  reports: "reports_insights",
  insights: "reports_insights",
  ai_chat: "reports_insights",
  daily_intelligence: "reports_insights",
  scorecards: "reports_insights",
  weekly_ops: "reports_insights",
  roadmap: "reports_insights",
  crm: "reports_insights",
  documentation: "reports_insights",
  ecommerce_settings: "reports_insights",
  website_control: "reports_insights",
  notifications: "reports_insights",
  security_logs: "sync_logs",
  performance: "reports_insights",
  staff_audits: "staff_management",
};
