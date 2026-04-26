/**
 * ClickFlash Ecosystem - Shared TypeScript Types
 * Version: 4.2.0
 *
 * These types are the definitive contract for all layers of the ecosystem.
 * Shared between Master Portal, Touch Kiosk, Gallery, Management, Website, and MoneyTrash.
 *
 * NEVER use `any` - use `unknown` and type guards instead.
 */

import { z } from 'zod';

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

export const UserRoleSchema = z.enum([
  'CEO',
  'Manager',
  'Team Leader',
  'Admin',
  'Photographer',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

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

export interface ManualEdits {
  _v?: number;
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
  centerX?: number;
  centerY?: number;
  zoomLevel?: number;
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
export interface Photo extends BaseRecord {
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

export interface CartItem {
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

export interface OrderItem {
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

export interface Album extends BaseRecord {
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
  products: string[];
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
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

export const PhotoSchema = z.object({
  id: z.string(),
  albumId: z.string(),
  url: z.string().url(),
  watermarkUrl: z.string().url().optional(),
  originalUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().optional(),
  photographerId: z.union([z.string(), z.number()]),
  category: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  resolution: z.number().optional(),
  size: z.number().optional(),
  capturedAt: z.string().datetime().optional(),
  hotelId: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  cullingStatus: z.enum(['Selected', 'Rejected', 'Pending']).optional(),
  proofingStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export const CartItemSchema = z.object({
  id: z.string(),
  photoId: z.string(),
  name: z.string(),
  format: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  deliveryType: z.enum(['digital', 'print', 'both']).optional(),
  productId: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  role: UserRoleSchema,
  avatarUrl: z.string().url().optional(),
  destinationId: z.string().optional(),
});

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  format: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  deliveryType: z.enum(['digital', 'print', 'both']).optional(),
  productId: z.string().optional(),
  checksum: z.string().optional(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  clientName: z.string(),
  email: z.string().email(),
  status: z.enum(['Completed', 'Pending', 'Processing', 'Cancelled', 'Delivered']),
  total: z.number().nonnegative(),
  photographerId: z.union([z.string(), z.number()]),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    format: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
    deliveryType: z.enum(['digital', 'print', 'both']).optional(),
    productId: z.string().optional(),
  })),
  paymentMethod: z.enum(['Cash', 'Card']).optional(),
  albumId: z.string().optional(),
  source: z.enum(['kiosk', 'manual']).optional(),
  roomNumber: z.string().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PhotoInput = z.infer<typeof PhotoSchema>;
export type CartItemInput = z.infer<typeof CartItemSchema>;
export type UserInput = z.infer<typeof UserSchema>;
export type OrderInput = z.infer<typeof OrderSchema>;