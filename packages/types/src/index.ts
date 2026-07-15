import { z } from 'zod';
/**
 * ClickFlash Ecosystem - Shared TypeScript Types
 * Version: 4.2.0
 *
 * These types are the definitive contract for all layers of the ecosystem.
 * Shared between Master Portal, Touch Kiosk, Gallery, Management, Website, and MoneyTrash.
 *
 * NEVER use `any` - use `unknown` and type guards instead.
 */


import type {
  Photo as ValidationPhoto,
  Album as ValidationAlbum,
  User as ValidationUser,
  CartItem as ValidationCartItem,
  OrderItem as ValidationOrderItem,
  Order as ValidationOrder,
  Product as ValidationProduct,
  Booking as ValidationBooking,
  Destination as ValidationDestination,
  TouchKiosk as ValidationTouchKiosk,
  SyncLog as ValidationSyncLog,
  SessionType as ValidationSessionType,
  Currency as ValidationCurrency,
  UserRole,
  ManualEdits
} from '@clickflash/validation';

export type {
  PhotoCreate,
  AlbumCreate,
  UserCreate,
  OrderCreate,
  ProductCreate,
  BookingCreate,
  Client,
  LicenseKey,
  Pagination,
  Sort,
  ManualEdits,
  PermissionString,
  RolePermissions,
  RfidAuth,
  PosOrderCreate,
  UserRole
} from '@clickflash/validation';

// =============================================================================
// BASE TYPES
// =============================================================================

export interface BaseRecord {
  id: string;
  created?: string;
  updated?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// USER & IDENTITY
// =============================================================================


export const PayrollTypeSchema = z.enum(['Salary', 'Commission']);
export type PayrollType = z.infer<typeof PayrollTypeSchema>;

export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export interface DayShift {
  start: string;
  end: string;
  enabled: boolean;
}

export interface DayWorkingHours {
  shift1: DayShift;
  shift2: DayShift;
}

export type WorkingHours = Record<DayOfWeek, DayWorkingHours>;

export interface User extends BaseRecord , ValidationUser{
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  specialty?: string;
  monthlyTarget?: number;
  dailyPhotoTarget?: number;
  payrollType?: PayrollType;
  monthlySalary?: number;
  commissionRate?: number;
  destinationId?: string;
  workingHoursJSON?: WorkingHours | string;
  workingHours?: WorkingHours;
  password?: string;
  faceDescriptor?: string;
}

export interface UserCreateInput {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  destinationId?: string;
}

export interface UserUpdateInput extends Partial<Omit<User, 'id' | 'created' | 'updated'>> { }

/// =============================================================================
// PHOTO & ASSETS
// =============================================================================

export interface Annotation {
  id: string;
  type: 'brush' | 'text' | 'shape';
  points?: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  opacity: number;
  text?: string;
  rect?: { x: number; y: number; w: number; h: number };
}


export interface RetouchAction {
  id: string;
  type: 'heal' | 'clone';
  x: number;
  y: number;
  radius: number;
  sourceX?: number;
  sourceY?: number;
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
  orientation?: number;
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

export type CullingStatus = 'Selected' | 'Rejected' | 'Pending';
export type ProofingStatus = 'pending' | 'approved' | 'rejected';

/**
 * ClickFlash Photo Model
 * Standardized for Master, Touch, and Cloud ecosystem.
 */
export interface Photo extends BaseRecord , ValidationPhoto{
  id: string;
  albumId: string;
  url: string;
  watermarkUrl?: string; // Mandate
  originalUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  photographerId: string | number; // Mandate: strict
  category?: string;
  manualEdits?: ManualEdits | null;
  autoEdits?: ManualEdits | null;
  autoEnhanced?: boolean;
  metadata?: PhotoMetadata;
  originalFilename?: string;
  fileHash?: string;
  storagePath?: string;
  proofingStatus?: ProofingStatus;
  sync_status?: string;
  sync_id?: string;
  width?: number;
  height?: number;
  resolution?: number; // Mandate
  size?: number; // Mandate: File size in bytes
  fileSize?: number;
  capturedAt?: string; // Mandate
  hotelId?: string; // Mandate
  mimeType?: string;
  cullingStatus?: CullingStatus;
  quality_flags?: string | string[];
  overallScore?: number;
  sharpnessScore?: number;
  orientation?: number;
  _pixelModified?: boolean;
  _metadataModified?: boolean;
}

export interface PhotoCreateInput {
  albumId: string;
  url: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  photographerId: string | number;
  category?: string;
  metadata?: PhotoMetadata;
  originalFilename?: string;
  fileHash?: string;
  storagePath?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  capturedAt?: string;
  hotelId?: string;
}

export interface PhotoUpdateInput extends Partial<Omit<Photo, 'id' | 'created' | 'updated'>> { }

// =============================================================================
// CART & ORDERS
// =============================================================================

export interface CartItem extends BaseRecord, ValidationCartItem {
  id: string;
  photoId: string;
  photo: Photo;
  name: string;
  format?: string;
  quantity: number;
  price: number;
  deliveryType?: 'digital' | 'print' | 'both';
  productId?: string;
}

export type OrderItemCreateInput = CartItemCreateInput;

export interface CartItemCreateInput {
  photoId: string;
  name: string;
  format?: string;
  quantity: number;
  price: number;
  deliveryType?: 'digital' | 'print' | 'both';
  productId?: string;
}

export type OrderStatus = 'Completed' | 'Pending' | 'Processing' | 'Cancelled' | 'Delivered';
export type PaymentMethod = 'Cash' | 'Card';

export interface OrderItem extends BaseRecord, ValidationOrderItem {
  id: string;
  name: string;
  format?: string;
  quantity: number;
  price: number;
  photo?: Photo;
  deliveryType?: 'digital' | 'print' | 'both';
  productId?: string;
  checksum?: string; // Integrity check for individuals
}

export interface Order extends BaseRecord , ValidationOrder{
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
  source?: 'kiosk' | 'manual';
  orderNumber?: string;
  roomNumber?: string;
  rfidTag?: string;
  access_pin?: string;
  magic_link_token?: string;
  cloud_sync_status?: string;
  cloud_sync_error?: string;
  checksum?: string; // SHA-256 Integrity Verification
  updatedAt?: string;
}

export interface OrderCreateInput {
  date: string;
  clientName: string;
  email: string;
  status: OrderStatus;
  total: number;
  photographerId: string | number;
  items: OrderItemCreateInput[];
  appliedDiscount?: number;
  destinationId?: string;
  paymentMethod?: PaymentMethod;
  albumId?: string;
  source?: 'kiosk' | 'manual';
  roomNumber?: string;
}

export interface OrderUpdateInput extends Partial<Omit<Order, 'id' | 'created' | 'updated'>> { }

// =============================================================================
// ALBUMS
// =============================================================================

export type AlbumStatus = 'Draft' | 'Finalized' | 'Archived';

export interface Album extends BaseRecord , ValidationAlbum{
  title: string;
  date: string;
  photographerId: string | number;
  roomNumber?: string;
  source?: string;
  eventType?: string;
  status?: AlbumStatus;
  customerEmail?: string;
  coverPhotoUrl?: string;
  thumbnailUrl?: string;
  categories?: string[];
  photos?: Photo[];
  numberOfPhotos?: number;
}

export interface AlbumCreateInput {
  title: string;
  date: string;
  photographerId: string | number;
  roomNumber?: string;
  source?: string;
  eventType?: string;
  customerEmail?: string;
}

export interface AlbumUpdateInput extends Partial<Omit<Album, 'id' | 'created' | 'updated'>> { }

// =============================================================================
// PRODUCTS & PRICING
// =============================================================================

export interface Product extends BaseRecord , ValidationProduct{
  name: string;
  category?: string;
  price: number;
  stock?: number;
  isFeatured?: boolean;
  description?: string;
  imageUrl?: string;
}

export interface Pack extends BaseRecord {
  name: string;
  description?: string;
  price: number;
  products: string[];
}

export interface SessionType extends BaseRecord , ValidationSessionType{
  name: string;
  numberOfPhotos: number;
  price: number;
}

export interface Currency extends BaseRecord , ValidationCurrency{
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

// =============================================================================
// SYSTEM & INFRA
// =============================================================================

export type KioskStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Connected' | 'Disconnected';

export interface TouchKiosk extends BaseRecord , ValidationTouchKiosk{
  name: string;
  status: KioskStatus;
  lastHeartbeat?: string;
  settings?: Record<string, unknown>;
  ipAddress?: string;
  version?: string;
  uploadFolderPath?: string;
  ordersFolderPath?: string;
}

export interface Destination extends BaseRecord , ValidationDestination{
  name: string;
  country: string;
  type: 'Resort' | 'City';
  licenseKey?: string;
  features?: {
    ai: boolean;
    face: boolean;
    watermark: boolean;
  };
  lastSeen?: string;
  status?: 'Online' | 'Offline' | 'Connected' | 'Disconnected' | 'Degraded';
  healthMetrics?: {
    cpu?: { load: number; temp: number | null };
    memory?: { used: number; total: number; percent: number };
    disk?: { used: number; total: number; percent: number };
    queueDepth?: { photos: number; db: number };
    sales?: {
      todayRevenue: number;
      todayOrders: number;
      pendingOrders: number;
    };
    uptime?: number;
  };
  version?: string;
  ipAddress?: string;
  siteCode?: string;
}

export interface SyncLog extends BaseRecord , ValidationSyncLog{
  masterId: string;
  destinationId?: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

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


// =============================================================================
// TYPE EXPORTS
// =============================================================================


// Added from apps/master/src/types/shared.ts
export type Photographer = User;

// --- PHOTO & ASSETS ---

export type Permission =
  | "viewDashboard"
  | "viewAlbums"
  | "manageOwnAlbums"
  | "manageAllAlbums"
  | "viewOrders"
  | "viewOwnOrders"
  | "viewAllOrders"
  | "viewPhotographers"
  | "managePhotographers"
  | "viewBookings"
  | "manageBookings"
  | "viewSettings"
  | "manageLocalSettings"
  | "manageSessionTypes"
  | "viewProducts"
  | "manageProducts"
  | "viewManagementDashboard"
  | "viewDestinations"
  | "viewReports"
  | "viewExpenses"
  | "viewCapital"
  | "viewAdjustments"
  | "manageAdjustments"
  | "viewPerformance"
  | "viewWarehouse"
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

export interface LoanPayment {
  id: string;
  loanId: string;
  date: string;
  amount: number;
}

export interface Loan extends BaseRecord {
  date: string;
  source: string;
  amount: number;
  interestRate: number;
  status: "Active" | "Paid Off";
  payments: LoanPayment[];
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

export interface Booking extends BaseRecord , ValidationBooking{
  clientName: string;
  email: string;
  phone?: string;
  clientEmail?: string;
  clientPhone?: string;
  bookingDate: string;
  bookingTime?: string;
  sessionTypeId: string;
  sessionId?: string;
  photographerId?: string;
  notes?: string;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no-show" | "Confirmed" | "Pending" | "Cancelled" | "Completed" | "No-show";
}

export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed" | "no-show" | "Confirmed" | "Pending" | "Cancelled" | "Completed" | "No-show";

export interface SystemSetting extends BaseRecord {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  description?: string;
}

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

// --- FLEET MONITORING ---

export interface StationStatus {
  success: boolean;
  health: {
    cpuLoad: number;
    cpuTemp: number | null;
    memoryUsed: number;
    memoryTotal: number;
    memoryPercent: number;
    diskUsed: number;
    diskTotal: number;
    diskPercent: number;
    diskIO: number;
    networkLatency: number;
    uptime: number;
    timestamp: string;
  } | null;
  sync: {
    timestamp: string;
    lastSync: string | null;
    isConnected: boolean;
    queue: {
      pending: number;
      failed: number;
    };
    circuit: {
      state: "CLOSED" | "OPEN" | "HALF_OPEN";
      openedAt: string | null;
    };
  } | null;
  identity: {
    deskId: string | null;
    machineId: string;
    isProvisioned: boolean;
    provisioningStatus: "VERIFIED" | "PENDING_TRIAGE" | "UNPROVISIONED";
  } | null;
  timestamp: string;
}

