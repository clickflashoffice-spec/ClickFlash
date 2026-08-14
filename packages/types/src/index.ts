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

export interface Album extends BaseRecord , ValidationAlbum{
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
    modelVersions: z.record(z.string()).optional(),
    profileVersions: z.record(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    timestamp: IsoDateTimeSchema,
    generator: z.enum(['MANUAL', 'AI', 'SYSTEM']),
  }).strict(),
  source: z.object({
    fileHash: z.string().trim().min(1),
    derivativeHashes: z.record(z.string()).optional(),
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
