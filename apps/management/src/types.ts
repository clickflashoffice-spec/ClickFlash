export * from "@clickflash/types";
import { BaseRecord, User } from "@clickflash/types";

export type Photographer = User;

export type View =
  | "Dashboard"
  | "Albums"
  | "Bookings"
  | "Orders"
  | "Clients"
  | "Photographers"
  | "Documentation"
  | "Products"
  | "Settings"
  | "GlobalDashboard"
  | "Inventory"
  | "Equipment";


// Management specific types that were purged from shared.ts
export type BookingStatus = "Pending" | "Confirmed" | "Cancelled";

export type PhotoCategory =
  | "Uncategorized"
  | "Portrait"
  | "Landscape"
  | "Action"
  | "Candid"
  | "Product"
  | "Architecure";

export interface CartItem {
  id: string; // Product id
  name: string;
  price: number;
  quantity: number;
  type?: "photo" | "product";
  photoId?: string; // If it's a specific photo being bought
  format?: string; // e.g., 'digital', 'print 4x6'
}

export interface ShootIdea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  equipmentNeeded: string[];
}

export interface EcommerceExtension {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  icon: string;
  config?: Record<string, unknown>;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface Loan extends BaseRecord {
  id: string; // explicitly added to bypass TS compiler error
  date: string;
  source: string;
  amount: number;
  interestRate: number;
  status: "Active" | "Paid Off";
  destinationId?: string;
  payments: LoanPayment[];
}

export type AppRole = "admin" | "manager" | "photographer" | "editor" | "support" | "Admin" | "Manager" | "CEO" | "Team Leader" | "Photographer" | "HQ Admin" | "Regional Manager" | "Resort Manager";

// Use string type for permission since management has 40+ dynamic permissions
export type Permission = string;

export type EquipmentStatus = "Available" | "In Use" | "Maintenance" | "Retired" | "Lost" | "Damaged" | "In Storage" | "Needs Repair";

export interface DailyObjective {
    id: string;
    photographerId: string;
    date: string;
    target: number;
    achieved: number;
    bonus: number;
    status?: string;
}

export type DestinationFeatures = any;

// Adding missing types from shared.ts that might have been lost
export interface SyncLog extends BaseRecord {
  masterId: string;
  destinationId?: string;
  level: "info" | "warn" | "error";
  event: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface LoginHistory extends BaseRecord {
  photographerId: string;
  date: string;
  ip: string;
}

export interface ExpenseCategory {
  id: string;
  label: string;
}

export interface EquipmentCategory {
  id: string;
  label: string;
}

export interface Expense extends BaseRecord {
  date: string;
  description: string;
  category: string;
  cost: number;
  destinationId: string;
  photographerId?: string | string[]; // accommodate legacy string
  photographerIds?: string[];
  invoiceUrl?: string;
}

export interface Adjustment extends BaseRecord {
  date: string;
  photographerId: string;
  amount: number;
  description: string;
  type: "Bonus" | "Deduction";
  status: "Paid" | "Unpaid";
}

export interface Equipment extends BaseRecord {
  name: string;
  type: string;
  status: EquipmentStatus;
  assignedToPhotographerId?: string;
  destinationId: string;
}

export interface AssistanceRequest {
  id: string;
  kioskId: string;
  message: string;
  timestamp: Date;
  status?: "pending" | "resolved" | "dismissed";
}

export interface FileSystemItem {
  name: string;
  type: "folder" | "photo";
  path: string;
  children?: FileSystemItem[];
}

export interface Booking extends BaseRecord {
  clientName: string;
  email: string;
  phone?: string;
  bookingDate: string;
  sessionTypeId: string;
  photographerId?: string;
  status: "Confirmed" | "Pending" | "Cancelled";
}

export interface SystemSetting extends BaseRecord {
  key: string;
  value: unknown;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedList<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface RevenueSnapshot {
  date: string;
  hourlyRevenue: Record<string, number>;
  totalRevenue: number;
  orderCount: number;
}

export interface ProductStats {
  productId: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
}

export interface PhotographerPerformance {
  photographerId: string;
  name: string;
  revenueGenerated: number;
  ordersCompleted: number;
  averageOrderValue: number;
  processingEfficiency: number;
}

export interface KioskSettings {
  logoUrl: string;
  welcomeMessage: string;
  kioskId: string;
  serverUrl?: string;
  screensaverTimeout: number;
  enableRFID: boolean;
  enableFaceLogin: boolean;
  enableFaceSearch: boolean;
  currencyCode?: string;
  password?: string;
}
