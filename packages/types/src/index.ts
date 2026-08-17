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
  UserRole,
  ManualEdits
} from '@clickflash/validation';

export {
  PhotoSchema,
  CartItemSchema,
  UserSchema,
  OrderSchema,
  UserRoleSchema,
  AlbumSchema,
  ProductSchema,
  BookingSchema,
  DestinationSchema,
  TouchKioskSchema,
  SyncLogSchema,
  SessionTypeSchema,
  CurrencySchema,
  PaginationSchema,
  SortSchema,
  DateRangeSchema
} from '@clickflash/validation';

export * from './ble.js';
export * from './phase3.js';
export * from './auth.js';
export * from './magicShot.js';
export * from './rover-telemetry.js';

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
  UserRole,
  MobileLogin,
  MobileUpload,
  MobileSync,
  FleetHeartbeat,
  FleetCommand,
  LicenseValidation,
  LicenseRevoke
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
  createdAt?: string;
  updatedAt?: string;
  tenantId?: string;
}

export interface Tenant extends BaseRecord {
  name: string;
  region?: string;
  baseCurrency?: string;
  config?: Record<string, unknown>;
}

// =============================================================================
// USER & IDENTITY
// =============================================================================

export interface Guest extends BaseRecord {
  name?: string;
  email?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  faceDescriptor?: string;  // 128D float array stored as JSON string or binary string for InsightFace
  faceVector?: number[];    // Parsed float array
  rfidTag?: string;
  status?: 'Active' | 'Inactive';
}

export interface GuestCreateInput {
  name?: string;
  email?: string;
  phone?: string;
  faceDescriptor?: string;
}


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

export type AnomalySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AnomalyEvent extends BaseRecord {
  photographerId: string | number;
  type: 'Idle' | 'LocationSpoof' | 'ExcessiveVoids' | 'CashUnderTable' | 'BuddyPunching';
  severity: AnomalySeverity;
  timestamp: string;
  spotId?: string;
  details?: Record<string, unknown>;
  resolved?: boolean;
}

/**
 * ClickFlash Photo Model
 * Standardized for Master, Touch, and Cloud ecosystem.
 */
export interface Photo extends BaseRecord {
  id: string;
  albumId: string;
  spotId?: string;
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
  aiTags?: {
    clothing_colors?: string[];
    accessories?: string[];
    context?: string;
    people_count?: number;
  };
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

export interface CartItem extends BaseRecord {
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

export interface OrderItem extends BaseRecord {
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

export interface Order extends BaseRecord {
  date: string;
  clientName: string;
  email: string;
  phone?: string;
  whatsappOptIn?: boolean;
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
  phone?: string;
  whatsappOptIn?: boolean;
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

export interface Album extends BaseRecord {
  title: string;
  date: string;
  photographerId: string | number;
  roomNumber?: string;
  source?: string;
  eventType?: string;
  status?: AlbumStatus;
  customerEmail?: string;
  customerPhone?: string;
  whatsappOptIn?: boolean;
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
  customerPhone?: string;
  whatsappOptIn?: boolean;
}

export interface AlbumUpdateInput extends Partial<Omit<Album, 'id' | 'created' | 'updated'>> { }

// =============================================================================
// PRODUCTS & PRICING
// =============================================================================

export interface Product extends BaseRecord {
  name: string;
  category?: string;
  price: number;
  stock?: number;
  isFeatured?: boolean;
  description?: string;
  imageUrl?: string;
  basePrice?: number;
  yieldMultiplier?: number;
}

export interface Pack extends BaseRecord {
  name: string;
  description?: string;
  price: number;
  products: string[];
  basePrice?: number;
  yieldMultiplier?: number;
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

// =============================================================================
// SYSTEM & INFRA
// =============================================================================

export type KioskStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Connected' | 'Disconnected';

export interface TouchKiosk extends BaseRecord {
  name: string;
  status: KioskStatus;
  lastHeartbeat?: string;
  settings?: Record<string, unknown>;
  ipAddress?: string;
  version?: string;
  uploadFolderPath?: string;
  ordersFolderPath?: string;
}

export interface Destination extends BaseRecord {
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

export enum GalleryTheme {
  CLASSIC = 'CLASSIC',
  FILMSTRIP = 'FILMSTRIP',
  GLASSMORPHIC = 'GLASSMORPHIC'
}

export enum AIPermission {
  MAGIC_ENHANCE = 'MAGIC_ENHANCE',
  REMOVE_BG = 'REMOVE_BG',
  WATERMARK_FREE = 'WATERMARK_FREE'
}

export interface GalleryConfig {
  theme: GalleryTheme;
  features: {
    enablePhotoBooks: boolean;
    enableReels: boolean;
    enableAiFigures: boolean;
  };
  aiPermissions: AIPermission[];
}

export interface SyncLog extends BaseRecord {
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

export interface Booking extends BaseRecord {
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

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Expected a valid ISO 8601 calendar date');

const IsoDateTimeSchema = z.string().datetime({ offset: true });
const SafeIntegerSchema = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const NonNegativeSafeIntegerSchema = SafeIntegerSchema.nonnegative();
const NullableSafeIntegerSchema = SafeIntegerSchema.nullable();
const NullableNonNegativeSafeIntegerSchema = NonNegativeSafeIntegerSchema.nullable();
const NullableBasisPointsSchema = NonNegativeSafeIntegerSchema.max(10_000).nullable();
const IdentityIdSchema = z.string().trim().min(1).max(255);
const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/, 'Expected an ISO 4217 currency code');
const TimezoneSchema = z.string().trim().min(1).max(100).refine((value) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, 'Expected a valid IANA timezone');

/**
 * Self-scoped photographer command-center snapshot.
 *
 * Producers must derive photographer, desk, and tenant identity from the
 * authenticated principal. Callers must not be allowed to select these values.
 * Money is represented exclusively as signed, safe integer minor units.
 */
export const PhotographerCommandCenterV1Schema = z.object({
  schemaVersion: z.literal('1'),
  generatedAt: IsoDateTimeSchema,
  source: z.enum(['MASTER', 'MANAGEMENT_HUB']),
  scope: z.object({
    photographerId: IdentityIdSchema,
    deskId: IdentityIdSchema,
    tenantId: IdentityIdSchema.optional(),
    timezone: TimezoneSchema,
    currency: CurrencyCodeSchema,
    currencyExponent: NonNegativeSafeIntegerSchema.max(6),
    from: IsoDateSchema,
    toExclusive: IsoDateSchema,
  }).strict(),
  sync: z.object({
    sourceWatermark: z.string().trim().min(1).max(255),
    lastHubSyncAt: IsoDateTimeSchema.nullable(),
    stale: z.boolean(),
    pendingEventCount: NonNegativeSafeIntegerSchema,
  }).strict(),
  shift: z.object({
    state: z.enum(['OFF_SHIFT', 'ON_SHIFT', 'UNKNOWN']),
    clockedInAt: IsoDateTimeSchema.nullable(),
    workedSecondsToday: NullableNonNegativeSafeIntegerSchema,
    verification: z.enum(['VERIFIED', 'UNVERIFIED', 'UNAVAILABLE']),
  }).strict(),
  activity: z.object({
    capturesReceived: NullableNonNegativeSafeIntegerSchema,
    photosCatalogued: NonNegativeSafeIntegerSchema,
    photosEdited: NullableNonNegativeSafeIntegerSchema,
    photosDelivered: NullableNonNegativeSafeIntegerSchema,
    distinctPhotosSold: NonNegativeSafeIntegerSchema,
    qualityFlagged: NonNegativeSafeIntegerSchema,
  }).strict(),
  sales: z.object({
    completedOrders: NonNegativeSafeIntegerSchema,
    grossMinor: SafeIntegerSchema,
    tipsMinor: SafeIntegerSchema,
    averageOrderMinor: SafeIntegerSchema,
    settledMinor: NullableSafeIntegerSchema,
    refundMinor: NullableSafeIntegerSchema,
    netMinor: NullableSafeIntegerSchema,
  }).strict(),
  earnings: z.object({
    commissionMinor: NullableSafeIntegerSchema,
    salaryMinor: NullableSafeIntegerSchema,
    bonusMinor: NullableSafeIntegerSchema,
    deductionMinor: NullableSafeIntegerSchema,
    paidOutMinor: NullableSafeIntegerSchema,
    payableMinor: NullableSafeIntegerSchema,
  }).strict(),
  performance: z.object({
    revenueTargetMinor: NullableSafeIntegerSchema,
    photoTarget: NullableNonNegativeSafeIntegerSchema,
    meetingsTaken: NullableNonNegativeSafeIntegerSchema,
    meetingsMade: NullableNonNegativeSafeIntegerSchema,
    meetingConversionBps: NullableBasisPointsSchema,
    photoSellThroughBps: NullableBasisPointsSchema,
    averageSessionSeconds: NullableNonNegativeSafeIntegerSchema,
  }).strict(),
  daily: z.array(z.object({
    date: IsoDateSchema,
    grossMinor: SafeIntegerSchema,
    orders: NonNegativeSafeIntegerSchema,
    photosCatalogued: NonNegativeSafeIntegerSchema,
    distinctPhotosSold: NonNegativeSafeIntegerSchema,
    workedSeconds: NullableNonNegativeSafeIntegerSchema,
  }).strict()).max(93),
  completeness: z.object({
    sales: z.enum(['FINAL', 'PROVISIONAL']),
    settlement: z.enum(['FINAL', 'UNAVAILABLE']),
    earnings: z.enum(['FINAL', 'PROVISIONAL', 'UNAVAILABLE']),
    shifts: z.enum(['FINAL', 'PROVISIONAL', 'UNAVAILABLE']),
    issues: z.array(z.string().trim().min(1).max(500)).max(100),
  }).strict(),
}).strict().superRefine((snapshot, context) => {
  const fromTimestamp = Date.parse(`${snapshot.scope.from}T00:00:00.000Z`);
  const toTimestamp = Date.parse(`${snapshot.scope.toExclusive}T00:00:00.000Z`);

  try {
    const currencyOptions = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: snapshot.scope.currency,
    }).resolvedOptions();
    if (
      currencyOptions.minimumFractionDigits !== snapshot.scope.currencyExponent ||
      currencyOptions.maximumFractionDigits !== snapshot.scope.currencyExponent
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currencyExponent must match the configured currency minor-unit scale',
        path: ['scope', 'currencyExponent'],
      });
    }
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'currency must have supported minor-unit metadata',
      path: ['scope', 'currency'],
    });
  }

  if (snapshot.scope.from >= snapshot.scope.toExclusive) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'toExclusive must be after from',
      path: ['scope', 'toExclusive'],
    });
  }

  const scopedDays = (toTimestamp - fromTimestamp) / 86_400_000;
  if (Number.isFinite(scopedDays) && scopedDays > 93) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Scope period must not exceed 93 calendar days',
      path: ['scope', 'toExclusive'],
    });
  }

  const seenDates = new Set<string>();
  let previousDate: string | undefined;
  snapshot.daily.forEach((entry, index) => {
    if (entry.date < snapshot.scope.from || entry.date >= snapshot.scope.toExclusive) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Daily date must be inside the half-open scope period',
        path: ['daily', index, 'date'],
      });
    }

    if (seenDates.has(entry.date)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Daily dates must be unique',
        path: ['daily', index, 'date'],
      });
    }

    if (previousDate !== undefined && entry.date <= previousDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Daily dates must be strictly ascending',
        path: ['daily', index, 'date'],
      });
    }

    seenDates.add(entry.date);
    previousDate = entry.date;
  });
});

export type PhotographerCommandCenterV1 = z.infer<typeof PhotographerCommandCenterV1Schema>;

/**
 * Deterministic Image Edit Recipe Contract
 * Guarantees immutable provenance, deterministic colors, and exact re-renders.
 */
export const ImageEditRecipeV1Schema = z.object({
  schemaVersion: z.literal('1'),
  provenance: z.object({
    authorId: IdentityIdSchema,
    engineVersion: z.string().trim().min(1),
    modelVersions: z.record(z.string(), z.string()).optional(),
    profileVersions: z.record(z.string(), z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    timestamp: IsoDateTimeSchema,
    generator: z.enum(['MANUAL', 'AI', 'SYSTEM']),
  }).strict(),
  source: z.object({
    fileHash: z.string().trim().min(1),
    derivativeHashes: z.record(z.string(), z.string()).optional(),
    width: NonNegativeSafeIntegerSchema,
    height: NonNegativeSafeIntegerSchema,
  }).strict(),
  color: z.object({
    exposure: z.number().min(-100).max(100).default(0),
    contrast: z.number().min(-100).max(100).default(0),
    highlights: z.number().min(-100).max(100).default(0),
    shadows: z.number().min(-100).max(100).default(0),
    whites: z.number().min(-100).max(100).default(0),
    blacks: z.number().min(-100).max(100).default(0),
    temperature: z.number().min(-100).max(100).default(0),
    tint: z.number().min(-100).max(100).default(0),
    saturate: z.number().min(-100).max(100).default(0),
    vibrance: z.number().min(-100).max(100).default(0),
    clarity: z.number().min(-100).max(100).default(0),
    soften: z.number().min(0).max(100).default(0),
    sharpen: z.number().min(0).max(100).default(0),
    hueRotate: z.number().min(-180).max(180).default(0),
    grayscale: z.number().min(0).max(100).default(0),
    sepia: z.number().min(0).max(100).default(0),
    invert: z.number().min(0).max(1).default(0),
    brightness: z.number().min(-100).max(100).default(0),
  }).strict(),
  geometry: z.object({
    rotate: z.number().min(-360).max(360).default(0),
    straighten: z.number().min(-45).max(45).default(0),
    perspectiveX: z.number().min(-50).max(50).default(0),
    perspectiveY: z.number().min(-50).max(50).default(0),
    crop: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      width: z.number().min(0).max(100),
      height: z.number().min(0).max(100),
    }).nullable().default(null),
  }).strict(),
  retouchActions: z.array(z.object({
    x: z.number(),
    y: z.number(),
    radius: z.number(),
    sourceX: z.number(),
    sourceY: z.number(),
  })).default([]),
  guard: z.object({
    safe: z.boolean().default(true),
    flags: z.array(z.string()).default([]),
  }).strict().optional(),
  approvals: z.array(z.object({
    approverId: IdentityIdSchema,
    timestamp: IsoDateTimeSchema,
    decision: z.enum(['APPROVED', 'REJECTED', 'PENDING'])
  })).default([]),
  colorProfile: z.object({
    workingSpace: z.string(),
    outputSpace: z.string(),
    depth: z.number()
  }).strict().optional(),
}).strict();

export type ImageEditRecipeV1 = z.infer<typeof ImageEditRecipeV1Schema>;

/**
 * Integer-only money used by immutable photographer events. The currency
 * exponent is carried with every monetary fact so consumers never guess the
 * scale (for example TND uses 3 decimal places and JPY uses 0).
 */
export const MoneyMinorV1Schema = z.object({
  amountMinor: SafeIntegerSchema,
  currency: CurrencyCodeSchema,
  currencyExponent: NonNegativeSafeIntegerSchema.max(6),
}).strict().superRefine((money, context) => {
  try {
    const options = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: money.currency,
    }).resolvedOptions();
    if (
      options.minimumFractionDigits !== money.currencyExponent ||
      options.maximumFractionDigits !== money.currencyExponent
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currencyExponent must match the currency minor-unit scale',
        path: ['currencyExponent'],
      });
    }
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'currency must have supported minor-unit metadata',
      path: ['currency'],
    });
  }
});

const PositiveMoneyMinorV1Schema = MoneyMinorV1Schema.refine(
  (money) => money.amountMinor > 0,
  { message: 'amountMinor must be greater than zero', path: ['amountMinor'] },
);

const NonNegativeMoneyMinorV1Schema = MoneyMinorV1Schema.refine(
  (money) => money.amountMinor >= 0,
  { message: 'amountMinor must not be negative', path: ['amountMinor'] },
);

export const PhotographerEventKindV1Schema = z.enum([
  'ORDER_COMPLETED',
  'PAYMENT_CAPTURED',
  'SETTLEMENT_POSTED',
  'REFUND_POSTED',
  'ATTRIBUTION_ASSIGNED',
  'COMMISSION_ACCRUED',
  'ADJUSTMENT_POSTED',
  'PAYOUT_POSTED',
  'SHIFT_STARTED',
  'SHIFT_ENDED',
  'BREAK_STARTED',
  'BREAK_ENDED',
  'REVERSAL_POSTED',
  'RECONCILIATION_APPROVED',
]);

export type PhotographerEventKindV1 = z.infer<typeof PhotographerEventKindV1Schema>;

const PhotographerEventPayloadV1Schema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ORDER_COMPLETED'),
    orderId: IdentityIdSchema,
    gross: NonNegativeMoneyMinorV1Schema,
    tips: NonNegativeMoneyMinorV1Schema,
    photoCount: NonNegativeSafeIntegerSchema,
  }).strict(),
  z.object({
    kind: z.literal('PAYMENT_CAPTURED'),
    orderId: IdentityIdSchema,
    paymentId: IdentityIdSchema,
    amount: PositiveMoneyMinorV1Schema,
    method: z.enum(['CASH', 'CARD', 'STRIPE', 'OTHER']),
  }).strict(),
  z.object({
    kind: z.literal('SETTLEMENT_POSTED'),
    orderId: IdentityIdSchema,
    paymentId: IdentityIdSchema,
    settlementId: IdentityIdSchema,
    grossAmount: PositiveMoneyMinorV1Schema,
    feeAmount: NonNegativeMoneyMinorV1Schema,
    netAmount: NonNegativeMoneyMinorV1Schema,
  }).strict(),
  z.object({
    kind: z.literal('REFUND_POSTED'),
    orderId: IdentityIdSchema,
    paymentId: IdentityIdSchema,
    refundId: IdentityIdSchema,
    amount: PositiveMoneyMinorV1Schema,
    reasonCode: z.string().trim().min(1).max(100),
  }).strict(),
  z.object({
    kind: z.literal('ATTRIBUTION_ASSIGNED'),
    orderId: IdentityIdSchema,
    method: z.enum([
      'DIRECT_CAPTURE',
      'ALBUM_OWNER',
      'KIOSK_SESSION',
      'MANUAL_REVIEW',
      'SYSTEM_RULE',
    ]),
    confidenceBps: NonNegativeSafeIntegerSchema.max(10_000).nullable(),
    assignedById: IdentityIdSchema.optional(),
  }).strict(),
  z.object({
    kind: z.literal('COMMISSION_ACCRUED'),
    commissionId: IdentityIdSchema,
    orderId: IdentityIdSchema,
    policyId: IdentityIdSchema,
    policyVersion: z.string().trim().min(1).max(100),
    basis: NonNegativeMoneyMinorV1Schema,
    rateBps: NonNegativeSafeIntegerSchema.max(10_000),
    amount: NonNegativeMoneyMinorV1Schema,
  }).strict(),
  z.object({
    kind: z.literal('ADJUSTMENT_POSTED'),
    adjustmentId: IdentityIdSchema,
    direction: z.enum(['CREDIT', 'DEBIT']),
    amount: PositiveMoneyMinorV1Schema,
    reasonCode: z.string().trim().min(1).max(100),
    approvedById: IdentityIdSchema,
  }).strict(),
  z.object({
    kind: z.literal('PAYOUT_POSTED'),
    payoutId: IdentityIdSchema,
    reconciliationId: IdentityIdSchema,
    amount: PositiveMoneyMinorV1Schema,
    periodFrom: IsoDateSchema,
    periodToExclusive: IsoDateSchema,
  }).strict(),
  z.object({
    kind: z.literal('SHIFT_STARTED'),
    shiftId: IdentityIdSchema,
    stationId: IdentityIdSchema.optional(),
    verification: z.enum(['BIOMETRIC', 'PIN', 'ADMIN', 'UNVERIFIED']),
  }).strict(),
  z.object({
    kind: z.literal('SHIFT_ENDED'),
    shiftId: IdentityIdSchema,
    stationId: IdentityIdSchema.optional(),
    verification: z.enum(['BIOMETRIC', 'PIN', 'ADMIN', 'UNVERIFIED']),
  }).strict(),
  z.object({
    kind: z.literal('BREAK_STARTED'),
    shiftId: IdentityIdSchema,
    breakId: IdentityIdSchema,
  }).strict(),
  z.object({
    kind: z.literal('BREAK_ENDED'),
    shiftId: IdentityIdSchema,
    breakId: IdentityIdSchema,
  }).strict(),
  z.object({
    kind: z.literal('REVERSAL_POSTED'),
    reversesEventId: z.string().uuid(),
    reasonCode: z.string().trim().min(1).max(100),
    approvedById: IdentityIdSchema,
  }).strict(),
  z.object({
    kind: z.literal('RECONCILIATION_APPROVED'),
    reconciliationId: IdentityIdSchema,
    periodFrom: IsoDateSchema,
    periodToExclusive: IsoDateSchema,
    currency: CurrencyCodeSchema,
    currencyExponent: NonNegativeSafeIntegerSchema.max(6),
    eventSetHash: z.string().regex(/^[a-f0-9]{64}$/),
    approvedById: IdentityIdSchema,
    approvedAt: IsoDateTimeSchema,
  }).strict(),
]);

/**
 * Append-only, source-identifiable photographer fact. This contract contains
 * no customer PII and does not by itself declare earnings payable.
 */
export const PhotographerEventV1Schema = z.object({
  schemaVersion: z.literal('1'),
  eventId: z.string().uuid(),
  producer: z.enum([
    'MASTER',
    'GALLERY',
    'MANAGEMENT_HUB',
    'CLOUD_BACKEND',
    'MOBILE_PHOTOGRAPHER',
    'SYSTEM_IMPORT',
  ]),
  producerEventId: IdentityIdSchema,
  photographerId: IdentityIdSchema,
  occurredAt: IsoDateTimeSchema,
  recordedAt: IsoDateTimeSchema,
  scope: z.object({
    deskId: IdentityIdSchema,
    tenantId: IdentityIdSchema.optional(),
    timezone: TimezoneSchema,
  }).strict(),
  sourceRecordId: IdentityIdSchema,
  correlationId: IdentityIdSchema.optional(),
  causationEventId: z.string().uuid().optional(),
  payload: PhotographerEventPayloadV1Schema,
}).strict().superRefine((event, context) => {
  const occurredAt = Date.parse(event.occurredAt);
  const recordedAt = Date.parse(event.recordedAt);
  if (recordedAt < occurredAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'recordedAt must not precede occurredAt',
      path: ['recordedAt'],
    });
  }

  if (event.causationEventId === event.eventId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'An event cannot cause itself',
      path: ['causationEventId'],
    });
  }

  if (event.payload.kind === 'ORDER_COMPLETED') {
    const { gross, tips } = event.payload;
    if (
      gross.currency !== tips.currency ||
      gross.currencyExponent !== tips.currencyExponent
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Order gross and tips must use the same currency and exponent',
        path: ['payload', 'tips'],
      });
    }
  }

  if (event.payload.kind === 'COMMISSION_ACCRUED') {
    const { basis, amount } = event.payload;
    if (
      basis.currency !== amount.currency ||
      basis.currencyExponent !== amount.currencyExponent
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Commission basis and amount must use the same currency and exponent',
        path: ['payload', 'amount'],
      });
    }
  }

  if (event.payload.kind === 'SETTLEMENT_POSTED') {
    const { grossAmount, feeAmount, netAmount } = event.payload;
    const sameCurrency = [feeAmount, netAmount].every(
      (money) =>
        money.currency === grossAmount.currency &&
        money.currencyExponent === grossAmount.currencyExponent,
    );
    if (!sameCurrency) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Settlement gross, fee, and net must use the same currency and exponent',
        path: ['payload'],
      });
    }
    if (grossAmount.amountMinor - feeAmount.amountMinor !== netAmount.amountMinor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Settlement net must equal gross minus fee',
        path: ['payload', 'netAmount', 'amountMinor'],
      });
    }
  }

  if (
    (event.payload.kind === 'PAYOUT_POSTED' ||
      event.payload.kind === 'RECONCILIATION_APPROVED') &&
    event.payload.periodFrom >= event.payload.periodToExclusive
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'periodToExclusive must be after periodFrom',
      path: ['payload', 'periodToExclusive'],
    });
  }

  if (event.payload.kind === 'RECONCILIATION_APPROVED') {
    try {
      const options = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: event.payload.currency,
      }).resolvedOptions();
      if (
        options.minimumFractionDigits !== event.payload.currencyExponent ||
        options.maximumFractionDigits !== event.payload.currencyExponent
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'currencyExponent must match the reconciliation currency scale',
          path: ['payload', 'currencyExponent'],
        });
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currency must have supported minor-unit metadata',
        path: ['payload', 'currency'],
      });
    }
  }
});

export type PhotographerEventV1 = z.infer<typeof PhotographerEventV1Schema>;

export const PhotographerReconciliationIssueCodeV1Schema = z.enum([
  'MISSING_ORDER',
  'DUPLICATE_ORDER_COMPLETION',
  'MISSING_PAYMENT_CAPTURE',
  'MISSING_SETTLEMENT',
  'MISSING_ATTRIBUTION',
  'AMBIGUOUS_ATTRIBUTION',
  'PAYMENT_TOTAL_MISMATCH',
  'SETTLEMENT_TOTAL_MISMATCH',
  'REFUND_EXCEEDS_CAPTURE',
  'REFUND_WITHOUT_PAYMENT',
  'COMMISSION_WITHOUT_ORDER',
  'COMMISSION_WITHOUT_ATTRIBUTION',
  'CURRENCY_MISMATCH',
  'PAYOUT_WITHOUT_APPROVAL',
  'STALE_APPROVAL',
]);

export const PhotographerReconciliationReadinessV1Schema = z.object({
  schemaVersion: z.literal('1'),
  status: z.enum(['UNAVAILABLE', 'BLOCKED', 'READY_FOR_REVIEW', 'APPROVED']),
  scope: z.object({
    photographerId: IdentityIdSchema,
    deskId: IdentityIdSchema,
    tenantId: IdentityIdSchema.optional(),
    timezone: TimezoneSchema,
    periodFrom: IsoDateSchema,
    periodToExclusive: IsoDateSchema,
    currency: CurrencyCodeSchema,
    currencyExponent: NonNegativeSafeIntegerSchema.max(6),
  }).strict(),
  assessedAt: IsoDateTimeSchema,
  coveredEventCount: NonNegativeSafeIntegerSchema,
  eventSetHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  approvalEventId: z.string().uuid().nullable(),
  issues: z.array(z.object({
    code: PhotographerReconciliationIssueCodeV1Schema,
    eventId: z.string().uuid().optional(),
    orderId: IdentityIdSchema.optional(),
  }).strict()).max(1_000),
}).strict();

export type PhotographerReconciliationReadinessV1 = z.infer<
  typeof PhotographerReconciliationReadinessV1Schema
>;

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

// --- MOBILE APP ---

export interface MobileSession extends BaseRecord {
  photographerId: string | number;
  deviceId: string;
  deviceModel?: string;
  loginTime: string;
  lastActive: string;
  token: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface FaceVector extends BaseRecord {
  photoId: string;
  descriptor: number[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// --- YIELD PRICING ---

export type WeatherCondition = 'Clear' | 'Cloudy' | 'Rain' | 'Snow' | 'Extreme';
export type CrowdDensity = 'Low' | 'Medium' | 'High' | 'Peak';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface DynamicPriceMultiplier {
  baseMultiplier: number;
  weather?: Partial<Record<WeatherCondition, number>>;
  crowdDensity?: Partial<Record<CrowdDensity, number>>;
  timeOfDay?: Partial<Record<TimeOfDay, number>>;
}

export interface YieldPricingRule extends BaseRecord {
  name: string;
  destinationId: string;
  isActive: boolean;
  priority: number;
  conditions: {
    weather?: WeatherCondition[];
    crowdDensity?: CrowdDensity[];
    timeOfDay?: TimeOfDay[];
  };
  multiplier: number;
  validFrom?: string;
  validTo?: string;
}

// =============================================================================
// PHASE 4: AI MEDIA GENERATION & UNSOLD REVENUE RECOVERY
// =============================================================================

export type ReelFormat = '9:16_vertical' | '16:9_landscape' | '1:1_square';
export type ReelMusicGenre = 'cinematic' | 'upbeat' | 'resort_vacation' | 'trending' | 'epic';

export interface ReelRequest {
  galleryId: string;
  photoIds: string[];
  musicGenre?: ReelMusicGenre;
  format?: ReelFormat;
  durationSeconds?: number;
  includeKenBurns?: boolean;
}

export interface ReelJob extends BaseRecord {
  galleryId: string;
  format: ReelFormat;
  durationSeconds: number;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export type EnhanceLevel = 'auto-correct' | 'pro-retouch' | 'magic-shot' | 'cinematic-hdr';

export interface EnhancementRequest {
  photoId: string;
  originalUrl: string;
  level: EnhanceLevel;
  arElements?: string[];
  destinationTheme?: string;
}

export interface EnhanceJob extends BaseRecord {
  photoId: string;
  level: EnhanceLevel;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  enhancedUrl?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export type Mesh3DStyle = 'realistic' | 'stylized' | 'low-poly';
export type Mesh3DFormat = 'gltf' | 'glb' | 'obj' | 'stl' | 'splat' | 'ply' | 'nerf';

export interface MeshGenerationRequest {
  photoIds: string[];
  style: Mesh3DStyle;
  format?: Mesh3DFormat;
  webhookUrl?: string;
  guestId?: string;
}

export interface Mesh3DJob extends BaseRecord {
  photoIds: string[];
  style: Mesh3DStyle;
  format: Mesh3DFormat;
  status: 'queued' | 'reconstructing_mesh' | 'texturing' | 'completed' | 'failed';
  modelUrl?: string;
  thumbnailUrl?: string;
  polygonCount?: number;
  error?: string;
}

export type GaussianSplatQuality = 'fast_preview' | 'cinematic_6dof' | 'ultra_dense';
export type GaussianSplatFormat = 'splat' | 'ply';

export interface CameraIntrinsics {
  focalLength?: number;
  fovDegrees?: number;
  sensorWidthMm?: number;
  principalPoint?: { x: number; y: number };
  focalLengthX?: number;
  focalLengthY?: number;
  principalPointX?: number;
  principalPointY?: number;
  distortionCoefficients?: number[];
}

export interface GaussianSplatRequest {
  photoIds: string[];
  sceneId?: string;
  quality?: GaussianSplatQuality;
  format?: GaussianSplatFormat;
  cameraIntrinsics?: CameraIntrinsics;
  pointBudget?: number;
  boundingRadiusMeters?: number;
  webhookUrl?: string;
  guestId?: string;
}

export interface GaussianSplatJob extends BaseRecord {
  photoIds?: string[];
  sceneId?: string;
  quality?: GaussianSplatQuality | 'STANDARD' | 'HIGH' | 'CINEMATIC_4K';
  format?: GaussianSplatFormat;
  status?: 'queued' | 'feature_matching' | 'structure_from_motion' | 'gaussian_rasterization' | 'completed' | 'failed' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  splatUrl?: string;
  plyUrl?: string;
  thumbnailUrl?: string;
  splatCount?: number;
  fileSizeBytes?: number;
  compressionRatio?: number;
  renderFpsEstimate?: number;
  error?: string;
}

export interface SalvageAnalysis extends BaseRecord {
  photoId: string;
  galleryId: string;
  filePath: string;
  emotionalScore: number;
  smileScore: number;
  sharpnessScore: number;
  compositionScore?: number;
  aiSalvageScore: number; // Overall score determining upsell viability
  recommendation: 'salvage_for_upsell' | 'archive_cold_storage' | 'purge';
  reasoning?: string;
}

export type SalvageItem = SalvageAnalysis;

export interface BatchAnalyzerEvent extends BaseRecord {
  batchId: string;
  destinationId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  totalPhotosScanned: number;
  salvagedCount: number;
  archivedCount: number;
  purgedCount: number;
  analyses: SalvageAnalysis[];
}

export interface UnsoldBatchScanResult {
  totalScanned: number;
  salvagedCount: number;
  archivedCount: number;
  purgedCount: number;
  items: SalvageAnalysis[];
  campaign?: SalvageCampaign;
}

export interface SalvageCampaign {
  id: string;
  galleryId: string;
  guestPhone?: string;
  guestEmail?: string;
  discountPercentage: number;
  magicLinkUrl: string;
  expiresAt: string;
  status: 'draft' | 'dispatched' | 'converted' | 'expired';
}

export interface MediaDiscardEvent extends BaseRecord {
  photoId: string;
  batchId: string;
  photographerId: string | number;
  discardReason: 'low_quality' | 'unrecognized_faces' | 'excessive_blur' | 'storage_optimization';
  deletedAt: string;
  purgedFromStorage: boolean;
}

export interface SalesTriggerEvent extends BaseRecord {
  triggerId: string;
  batchId: string;
  galleryId: string;
  guestPhone?: string;
  guestWhatsApp?: string;
  aiSalvageScore: number;
  selectedPhotoIds: string[];
  proposedDiscountPercentage: number;
  magicLinkUrl?: string;
  dispatchedToWhatsApp: boolean;
  dispatchedAt?: string;
}

// =============================================================================
// WHATSAPP SALES SWARM & META WEBHOOKS
// =============================================================================

export interface MetaWebhookEntry {
  id: string;
  time?: number;
  changes: Array<{
    field: string;
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: 'text' | 'interactive' | 'button' | 'image' | 'location' | 'unknown' | string;
        text?: { body: string };
        interactive?: {
          type: 'button_reply' | 'list_reply' | string;
          button_reply?: { id: string; title: string };
          list_reply?: { id: string; title: string; description?: string };
        };
        button?: { text: string; payload?: string };
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed' | string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
  }>;
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface SwarmLeadEngagement {
  guestId?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  resortName?: string;
  albumId?: string;
  galleryId?: string;
  totalOpened?: number;
  totalFavorites?: number;
  cartTotal?: number;
  lastActiveAt?: number;
  topActivity?: string;
  whatsappOptIn?: boolean;
}

export interface SwarmNegotiationSession extends BaseRecord {
  phoneNumber: string;
  guestId?: string;
  albumId?: string;
  engagementLevel: 'COLD' | 'WARM' | 'HOT';
  offeredDiscountPercentage: number;
  offeredDiscountCode?: string;
  magicLinkUrl?: string;
  status: 'active' | 'converted' | 'expired' | 'declined';
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
}

export interface SwarmDispatchResult {
  success: boolean;
  leadId?: string;
  recipientPhone: string;
  message: string;
  discountCode?: string;
  discountPercentage?: number;
  magicLinkUrl?: string;
  urgencyLevel: 'low' | 'medium' | 'high';
}

// -------------------------------------------------------------------------
// AI Grading & VLM Emotional Bypass Data Contracts
// -------------------------------------------------------------------------

export type PhotoGradeCategory =
  | 'HERO_GRADE'
  | 'COMMERCIAL_GRADE'
  | 'EMOTIONAL_SAVED_GRADE'
  | 'DISCARD_GRADE';

export interface TechnicalMetrics {
  sharpnessScore: number;
  contrastScore: number;
  lightingScore: number;
  exposureScore: number;
  blurScore: number;
  compositionScore: number;
}

export interface VlmEmotionalMetrics {
  emotionalScore: number;
  smileScore: number;
  eyeContactScore: number;
  candidBondingScore: number;
  triumphMomentScore: number;
  emotionalKeywords: string[];
  sceneDescription: string;
}

export interface AIGradingResult {
  photoId: string;
  filePath: string;
  galleryId?: string;
  category: PhotoGradeCategory;
  overallScore: number;
  technicalMetrics: TechnicalMetrics;
  emotionalMetrics: VlmEmotionalMetrics;
  emotionalBypassTriggered: boolean;
  emotionalBypassReason?: string;
  suggestedCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  monetizationTags: string[];
  gradeReason: string;
  processedAt: string;
}

export interface AIGradeBatchRequest {
  photos: Array<{
    filePath: string;
    photoId?: string;
    galleryId?: string;
  }>;
  concurrencyLimit?: number;
  bypassThreshold?: number;
  minHeroScore?: number;
}

export interface AIGradeBatchResult {
  total: number;
  heroCount: number;
  commercialCount: number;
  emotionalSavedCount: number;
  discardCount: number;
  durationMs: number;
  results: AIGradingResult[];
}

// -------------------------------------------------------------------------
// Phase 7: The V9.0 Quantum Autonomous Concession Paradigm Contracts
// -------------------------------------------------------------------------

export interface SpatialHoloGalleryConfig {
  fov: number;
  ambientLightIntensity: number;
  spatialDepthScale: number;
  enableHeadTracking: boolean;
  enableSpatialAudio: boolean;
  theme: 'CRYSTAL_ORBIT' | 'CYBER_GALLERY' | 'VOLUMETRIC_HORIZON';
}

export interface WebGPUProcessingPipeline {
  supported: boolean;
  deviceType?: 'discrete' | 'integrated' | 'cpu';
  maxTextureDimension2D?: number;
  superResolutionFactor: 2 | 4;
  activeModel: 'EDSR_QUANTIZED' | 'ESRGAN_COMPACT' | 'BOKEH_NEURAL_SEGMENT';
}

export interface VoiceConciergeSession extends BaseRecord {
  sessionId: string;
  guestLanguage: string;
  voiceStyle: 'ENERGETIC_RESORT_GUIDE' | 'LUXURY_VIP_CONCIERGE' | 'FRIENDLY_LOCAL_PHOTOGRAPHER';
  activeIntent?: 'BROWSE_PHOTOS' | 'SELECT_BUNDLE' | 'MAGIC_EDIT' | 'CHECKOUT' | 'FAQ';
  transcriptLog: Array<{
    speaker: 'guest' | 'concierge';
    text: string;
    timestamp: string;
  }>;
}

export interface AutonomousRoboticTelemetry extends BaseRecord {
  nodeType: 'DRONE_DOCK' | 'COASTER_HIGH_SPEED_CAM' | 'ROVING_ROVER_CAM';
  batteryPercentage: number;
  connectionStatus: 'ONLINE_5G' | 'LAN_UWB' | 'DEGRADED';
  activeMission?: string;
  coordinates: {
    lat: number;
    lng: number;
    altitudeMeters?: number;
  };
  capturesPerMinute: number;
  storageAvailableGb: number;
}

export interface GaussianSplatModel extends BaseRecord {
  splatUrl: string;
  pointCount: number;
  boundsRadius: number;
  focalLength: number;
  sceneClassification: 'COASTER_LOOP' | 'CHARACTER_MEET' | 'WATER_SPLASH' | 'SCENIC_PANORAMA';
  qualityScore: number;
  lodLevels: number;
}

export interface TranscodeChunk {
  chunkIndex: number;
  startTimeSec: number;
  durationSec: number;
  assignedNodeId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  chunkOutputUrl?: string;
  renderTimeMs?: number;
  error?: string;
}

export interface TranscodeGridNode {
  nodeId: string;
  role: 'MASTER' | 'TOUCH_KIOSK' | 'WORKER_EDGE';
  ipAddress: string;
  port: number;
  hardwareCores: number;
  hasGpuAcceleration: boolean;
  isBusy: boolean;
  currentLoadPercent: number;
  lastHeartbeatTimestamp: number;
}

export interface DistributedTranscodingJob extends BaseRecord {
  jobId: string;
  sourceAssetUrl: string;
  targetFormat: '4K_H265' | 'PRORES_HERO' | 'TIKTOK_9_16_BEAT_SYNC';
  chunkCount: number;
  completedChunks: number;
  assignedNodes: string[];
  status: 'QUEUED' | 'SLICING' | 'TRANSCODING' | 'STITCHING' | 'COMPLETED' | 'FAILED';
  renderTimeMs?: number;
  outputUrl?: string;
  chunks?: TranscodeChunk[];
  error?: string;
}

export interface NlpSemanticQuery {
  queryText: string;
  queryEmbedding?: number[];
  categoryFilter?: string;
  minSimilarity: number;
  maxResults: number;
}

export interface DroneMissionDispatch extends BaseRecord {
  missionId: string;
  droneNodeId: string;
  vipGuestId: string;
  flightPathMode: 'ORBIT_360' | 'HERO_FLYBY' | 'PULLBACK_REVEAL' | 'STATIONARY_HOVER';
  targetGps: {
    latitude: number;
    longitude: number;
    altitudeMeters: number;
  };
  status: 'PREFLIGHT' | 'AIRBORNE' | 'RECORDING' | 'RETURNING' | 'LANDED_CHARGING';
  batteryRemainingPercent: number;
}

// Phase 10: The V12.0 Autonomous Hyper-Ecosystem Types

export type LightingPreset = 'GOLDEN_HOUR' | 'CYBERPUNK_NEON' | 'DRAMATIC_SUNSET' | 'STUDIO_REMBRANDT' | 'FAIRY_TALE_DUSK' | 'MOONLIT_NIGHT';

export interface NeuralRelightingConfig {
  preset: LightingPreset;
  intensity: number;
  lightAzimuthDeg: number;
  lightElevationDeg: number;
  colorTemperatureK: number;
  specularBoost: number;
  depthThreshold: number;
}

export interface AtmosphericVfxJob extends BaseRecord {
  photoId: string;
  relightingConfig: NeuralRelightingConfig;
  particleEffect?: 'FIREWORKS' | 'GOLDEN_DUST' | 'MAGICAL_SNOW' | 'AURORA_BOREALIS' | 'WATER_DROPLET_SPARKLE';
  outputUrl?: string;
  depthMapUrl?: string;
  processingTimeMs?: number;
  status: 'QUEUED' | 'ESTIMATING_DEPTH' | 'COMPUTING_PBR_RELIGHT' | 'COMPLETED' | 'FAILED';
}

export interface NeuromorphicCaptureFrame {
  frameIndex: number;
  timestampMicroseconds: number;
  opticalFlowMagnitude: number;
  velocityVector: { x: number; y: number };
  motionBlurScore: number;
  deblurredBufferUrl?: string;
  coherenceConfidence: number;
}

export interface HighSpeedMotionDeblurConfig {
  shutterSpeedMicroseconds: number;
  coasterSpeedKmh: number;
  targetResolution: '1080P_120FPS' | '4K_60FPS' | '8K_RAW';
  motionVectorInterpolationPasses: number;
  eventThreshold: number;
}

export interface GameTheoreticYieldQuote {
  sessionId: string;
  guestFamilySize: number;
  parkDwellHours: number;
  totalPhotosCaptured: number;
  rawCartValueUsd: number;
  elasticityScore: number;
  recommendedBundleDiscountPercent: number;
  optimizedPriceUsd: number;
  includedVipPerks: string[];
  expirationSeconds: number;
  negotiationRound: number;
}

export interface ZeroTrustNodeAttestation {
  nodeId: string;
  hardwareFingerprintDigest: string;
  tpmEnclavePublicKey: string;
  leaseGrantedAt: string;
  leaseExpiresAt: string;
  allowedCapabilities: Array<'EDGE_INGESTION' | 'VECTOR_SEARCH' | 'TRANSCODE_GRID' | 'SPLATTING_3D' | 'PAYMENT_CAPTURE'>;
  signatureEd25519: string;
  nonce: string;
}

// -------------------------------------------------------------------------
// Phase 10: The V12.0 Autonomous Quantum Concession & Global AI Symphony
// -------------------------------------------------------------------------

export interface AudioSteganographicPayload {
  guestId: string;
  albumId: string;
  carrierFrequencyHz: number;
  watermarkDigest: string;
  forensicTimestamp: number;
  inaudibleCarrierEnabled: boolean;
}

export interface StoryboardChapter {
  title: string;
  narrativeScript: string;
  photoIds: string[];
  durationSeconds: number;
  cameraMotion: 'KEN_BURNS_PAN' | 'PARALLAX_ZOOM' | 'MATRIX_ORBIT';
  bgmTrack: string;
}

export interface AiNarrativeFilmStoryboard extends BaseRecord {
  storyboardId: string;
  guestFamilyName: string;
  totalDurationSeconds: number;
  narratorVoice: 'DISNEY_WARM_STORYTELLER' | 'EPIC_CINEMATIC_HERO' | 'CHEERFUL_RESORT_HOST';
  chapters: StoryboardChapter[];
  status: 'DRAFTING' | 'GENERATING_VOICE' | 'COMPOSING_4K' | 'READY';
  renderedFilmUrl?: string;
}

export interface FotaTelemetryHeartbeat extends BaseRecord {
  nodeId: string;
  nodeRole: 'MASTER_LAN_GATEWAY' | 'TOUCH_KIOSK' | 'MOBILE_PRO' | 'EDGE_CAMERA_UWB';
  firmwareVersion: string;
  cpuTempCelsius: number;
  shutterActuationsTotal: number;
  batteryPercentage?: number;
  storageFreeGb: number;
  pendingUpdateVersion?: string;
  lastPingTimestamp: number;
}

export interface PppCurrencyRate extends BaseRecord {
  currencyCode: string;
  countryName: string;
  pppMultiplier: number;
  rawExchangeRateToUsd: number;
  localizedSymbol: string;
}

// -------------------------------------------------------------------------
// Phase 12: The V13.0 Hyper-Immersive Autonomous Resort Holoverse Contracts
// -------------------------------------------------------------------------

export interface FourDGaussianVideoSequence extends BaseRecord {
  sequenceId: string;
  sceneName: string;
  totalFrames: number;
  fps: number;
  splatChunkUrls: string[];
  boundsRadiusMeters: number;
  compressionCodec: 'SPLAT_STREAM_V2' | 'DYNAMIC_LOD_4D';
  streamingBitrateKbps: number;
}

export interface MultilingualDubbingJob extends BaseRecord {
  jobId: string;
  sourceFilmId: string;
  targetLanguage: string;
  translatedScript: string;
  dubbedAudioUrl?: string;
  lipSyncConfidenceScore: number;
  status: 'QUEUED' | 'TRANSLATING' | 'VOICE_CLONING' | 'LIP_SYNCING' | 'COMPLETED' | 'FAILED';
}

export interface DroneSwarmFormation extends BaseRecord {
  formationId: string;
  activeDroneIds: string[];
  landmarkTarget: string;
  formationPattern: 'V_FORMATION' | 'SPIRAL_ASCENT' | 'PINWHEEL_360' | 'DYNAMIC_TRACKING';
  minSeparationMeters: number;
  collisionAvoidanceActive: boolean;
  status: 'FORMING' | 'COORDINATED_SHOOT' | 'DISPERSING' | 'RETURN_TO_DOCK';
}

export interface ZkBiometricRevocationProof extends BaseRecord {
  proofId: string;
  guestCommitmentHash: string;
  nullifierHash: string;
  snarkProofHex: string;
  verificationKeyDigest: string;
  isVerified: boolean;
  revokedAt: string;
}

// -------------------------------------------------------------------------
// Phase 13: The V14.0 Quantum Edge-Cloud Synapse & Robotic Fleet Contracts
// -------------------------------------------------------------------------

export interface RoboticRoverTelemetry extends BaseRecord {
  roverId: string;
  batteryPercent: number;
  dockingState: 'CHARGING' | 'PATROLLING' | 'COMPOSING_SHOT' | 'EMERGENCY_HALT';
  currentZone: string;
  capturesToday: number;
  lidarHealth: 'OPERATIONAL' | 'DEGRADED' | 'CALIBRATING';
  dockId?: string;
}

export interface SpatialAudioAcousticConfig {
  reverbDecayTimeMs: number;
  roomDimensionsMeters: { length: number; width: number; height: number };
  absorptionCoefficients: { walls: number; floor: number; ceiling: number };
  virtualSpeakerLayout: 'STEREO' | '5.1_SURROUND' | '7.1.4_DOLBY_ATMOS';
  binauralHrtfEnabled: boolean;
}

export interface BiometricLivenessResult {
  isLive: boolean;
  confidenceScore: number;
  depthMapVariance: number;
  blinkDetected: boolean;
  spoofTypeDetected: 'NONE' | 'PRINTED_2D_PHOTO' | 'SCREEN_REPLAY_3D' | 'LATEX_MASK';
}

export interface GeoFencedUpsellTrigger extends BaseRecord {
  triggerId: string;
  guestId: string;
  exitGateZone: string;
  distanceMeters: number;
  triggerTime: string;
  offerType: 'LAST_CHANCE_DIGITAL_PASS' | 'VIP_PRINT_BUNDLE' | 'SPLAT_3D_MEMORY';
  discountPercent: number;
  pushDelivered: boolean;
}

// -------------------------------------------------------------------------
// Phase 14: The V15.0 Autonomous Quantum Holographic & Universal Matrix
// -------------------------------------------------------------------------

export interface HolographicLightFieldConfig {
  viewsCount: 45 | 90 | 180;
  displayTarget: 'LOOKING_GLASS_8K' | 'HOLOGRAPHIC_MEMORIAL_PILLAR' | 'LIGHTFIELD_PROJECTOR';
  focalPlaneMeters: number;
  depthBudgetMeters: { near: number; far: number };
  quiltResolution: { width: number; height: number; columns: number; rows: number };
}

export interface HolographicStreamFrame {
  frameId: string;
  sourceSplatUrl: string;
  quiltImageUrl: string;
  viewsRendered: number;
  encodingBitrateMbps: number;
  renderLatencyMs: number;
}

export interface SubsurfaceSkinRadianceConfig {
  epidermalScattering: number;
  subdermalAbsorption: number;
  melaninLevel: number;
  sunFlareDiffraction: number;
  poreMicroDetailRetention: number;
}

export interface SkinRadianceResult {
  photoId: string;
  originalUrl: string;
  enhancedUrl: string;
  radianceScore: number;
  skinTonePreservationIndex: number;
  processingTimeMs: number;
}

export interface ZkArchiveShard {
  shardIndex: number;
  shardHash: string;
  byteSize: number;
  storageNodeId: string;
}

export interface ZkArchiveShardManifest extends BaseRecord {
  archiveId: string;
  erasureCoding: { dataShards: number; parityShards: number; totalShards: number };
  merkleRoot: string;
  shards: ZkArchiveShard[];
  zkPossessionProof: string;
  totalByteSize: number;
}

export interface QuantumVenueArbitrageQuote {
  originVenueId: string;
  targetVenueId: string;
  weatherCondition: 'HEAVY_RAIN' | 'TYPHOON' | 'HEATWAVE' | 'CLEAR_SUNNY';
  passTransferEligibility: boolean;
  currencyBasketRatio: number;
  recommendedCrossParkOffer: string;
  yieldArbitrageSavingsPercent: number;
}








