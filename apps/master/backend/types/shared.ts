/**
 * STAR MASTER OS - UNIFIED SYSTEM TYPES (v5.0.0)
 *
 * This file is the definitive contract for all layers of the ecosystem.
 * Shared between Master Portal, Touch Kiosk, and Management Cloud.
 */

export interface BaseRecord {
  id: string;
  created?: string;
  updated?: string;
  collectionId?: string;
  collectionName?: string;
  created_at?: string;
  updated_at?: string;
}

// --- USER & IDENTITY ---

export type UserRole =
  | "CEO"
  | "Manager"
  | "Team Leader"
  | "Admin"
  | "Photographer";
export type PayrollType = "Salary" | "Commission";

export interface DayShift {
  start: string;
  end: string;
  enabled: boolean;
}

export interface DayWorkingHours {
  shift1: DayShift;
  shift2: DayShift;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WorkingHours = Record<DayOfWeek, DayWorkingHours>;

export interface User extends BaseRecord {
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  specialty?: string;
  monthlyTarget?: number;
  dailyPhotoTarget?: number;
  payrollType?: PayrollType;
  monthlySalary?: number;
  commissionRate?: number; // 0-100
  destinationId?: string;
  workingHoursJSON?: WorkingHours | string;
  workingHours?: WorkingHours;
  password?: string;
}

export type Photographer = User;

// --- PHOTO & ASSETS ---

export interface Annotation {
  id: string;
  type: "brush" | "text" | "shape";
  points?: Array<{ x: number; y: number }>; // For brush
  color: string;
  width: number;
  opacity: number;
  text?: string;
  rect?: { x: number; y: number; w: number; h: number };
}

export interface ManualEdits {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturate: number;
  vibrance: number;
  grayscale: number;
  sepia: number;
  invert: number;
  hueRotate: number;
  temperature: number;
  tint: number;
  whites: number;
  blacks: number;
  soften: number;
  rotate: number;
  straighten: number;
  perspectiveX: number;
  perspectiveY: number;
  clarity: number;
  dropShadow: number;
  sharpen?: number;
  vignette?: number;
  brightness?: number;
  retouchActions?: RetouchAction[];
  annotations?: Annotation[];
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Auto-center and frame positioning
  centerX?: number; // 0-1, horizontal center point (0.5 = center)
  centerY?: number; // 0-1, vertical center point (0.5 = center)
  zoomLevel?: number; // zoom level for framing (1 = fit, >1 = zoomed in)
}

export interface RetouchAction {
  id: string;
  type: "heal" | "clone";
  x: number;
  y: number;
  radius: number;
  sourceX?: number; // Clone source X
  sourceY?: number; // Clone source Y
  timestamp: number;
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  dateTaken?: string;
  dimensions?: { width: number; height: number };
  fileSize?: number;
  focalLength?: string;
  manualEdits?: ManualEdits;
  orientation?: number; // EXIF orientation (1-8)
  exif?: {
    ISO?: number;
    ExposureTime?: string;
    FNumber?: string;
    FocalLength?: string;
    DateTime?: string;
    Make?: string;
    Model?: string;
    Orientation?: number;
  };
}

export interface Photo extends BaseRecord {
  albumId: string;
  url: string;
  originalUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  photographerId?: string | number;
  category?: string;
  manualEdits?: ManualEdits | null;
  metadata?: PhotoMetadata;
  originalFilename?: string;
  fileHash?: string;
  storagePath?: string;
  proofingStatus?: "pending" | "approved" | "rejected";
  sync_status?: string;
  sync_id?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  cullingStatus?: "Selected" | "Rejected" | "Pending";
  overallScore?: number;
  sharpnessScore?: number;
  orientation?: number; // EXIF orientation (1-8) - top level for easy access
  _pixelModified?: boolean;
  _metadataModified?: boolean;
}

// --- ALBUMS ---

export type AlbumStatus = "Draft" | "Finalized" | "Archived";

export interface Album extends BaseRecord {
  title: string;
  date: string; // YYYY-MM-DD
  photographerId: string | number;
  roomNumber?: string;
  source?: string;
  eventType?: string;
  status?: AlbumStatus;
}

export type Permission =
  | "manageEquipmentCategories"
  | "viewPayroll"
  | "runPayroll"
  | "viewEcommerceSettings"
  | "viewGlobalSettings"
  | "manageGlobalSettings"
  | "viewDocumentation"
  | "manageExpenseCategories"
  | "viewConsumables"
  | "manageConsumables"
  | "viewPortfolio"
  | "managePortfolio";

// --- PRODUCTS & PRICING ---

export interface Product extends BaseRecord {
  name: string;
  category?: string;
  price: number;
  stock?: number;
  isFeatured?: boolean | number;
  description?: string;
  imageUrl?: string;
}

export interface Pack extends BaseRecord {
  name: string;
  description?: string;
  price: number;
  products: string[]; // IDs of products
}

export interface SessionType extends BaseRecord {
  name: string;
  numberOfPhotos: number;
  price: number;
}

export interface Currency extends BaseRecord {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

// --- ORDERS ---

export type OrderStatus =
  | "Completed"
  | "Pending"
  | "Processing"
  | "Cancelled"
  | "Delivered";
export type PaymentMethod = "Cash" | "Card";

export interface OrderItem {
  id: string;
  name: string;
  format?: string;
  quantity: number;
  price: number;
  photo?: Photo;
  deliveryType?: "digital" | "print" | "both";
  productId?: string;
}

export interface Order extends BaseRecord {
  date: string;
  clientName: string;
  email: string;
  status: OrderStatus;
  total: number;
  photographerId: string | number;
  items: OrderItem[];
  appliedDiscount?: number;
  destinationId?: string;
  paymentMethod?: PaymentMethod;
  albumId?: string;
  source?: "kiosk" | "manual";
  orderNumber?: string;
  roomNumber?: string;
  rfidTag?: string;
  updatedAt?: string;
  checksum?: string; // Integrity check — SHA-256 of critical order fields
}

// --- BUSINESS & MANAGEMENT ---

export interface Destination extends BaseRecord {
  name: string;
  country: string;
  type: "Resort" | "City";
  licenseKey?: string;
  features?: {
    ai: boolean;
    face: boolean;
    watermark: boolean;
  };
  lastSeen?: string;
  status?: "Online" | "Offline" | "Connected" | "Disconnected" | "Degraded";
  healthMetrics?: {
    cpu?: {
      load: number;
      temp: number | null;
    };
    memory?: {
      used: number;
      total: number;
      percent: number;
    };
    disk?: {
      used: number;
      total: number;
      percent: number;
    };
    queueDepth?: {
      photos: number;
      db: number;
    };
    sales?: {
      todayRevenue: number;
      todayOrders: number;
      pendingOrders: number;
    };
    uptime?: number;
  };
  version?: string;
  ipAddress?: string;
}

export interface SyncLog extends BaseRecord {
  masterId: string;
  destinationId?: string;
  level: "info" | "warn" | "error";
  event: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DailyObjective extends BaseRecord {
  photographer_id: string | number;
  date: string;
  target: number;
  status: "Pending" | "Completed";
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
  photographerId?: string;
}

export interface Loan extends BaseRecord {
  date: string;
  source: string;
  amount: number;
  interestRate: number;
  status: "Active" | "Paid Off";
  payments: Array<{
    id: string;
    loanId: string;
    date: string;
    amount: number;
  }>;
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
  status: "In Use" | "Available" | "Needs Repair" | "Retired" | "In Storage";
  assignedToPhotographerId?: string;
  destinationId: string;
}

// --- SYSTEM & INFRA ---

export type KioskStatus =
  | "Active"
  | "Inactive"
  | "Maintenance"
  | "Connected"
  | "Disconnected";

export interface TouchKiosk extends BaseRecord {
  name: string;
  status: KioskStatus;
  lastHeartbeat?: string;
  settings?: Record<string, unknown>;
  ipAddress?: string;
  version?: string;
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
  photo?: Photo;
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
  value: string | number | boolean | Record<string, unknown>;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedList<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

// --- ANALYTICS & BI ---

export interface RevenueSnapshot {
  date: string;
  hourlyRevenue: Record<string, number>; // "09:00": 150.00
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
  processingEfficiency: number; // Avg mins per album processing
}
