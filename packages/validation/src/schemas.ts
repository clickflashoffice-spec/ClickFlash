import { z } from 'zod';

// =============================================================================
// PRIMITIVES & SHARED
// =============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// =============================================================================
// USER & AUTH
// =============================================================================

export const UserRoleSchema = z.enum([
  'CEO', 'Manager', 'Team Leader', 'Admin', 'Photographer',
]);

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: UserRoleSchema,
  avatarUrl: z.string().url().optional(),
  specialty: z.string().max(100).optional(),
  destinationId: z.string().optional(),
});

export const UserCreateSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: UserRoleSchema,
  password: z.string().min(8).max(128),
  destinationId: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const MagicLinkSchema = z.object({
  token: z.string().min(32).max(256),
});

export const PinLoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().min(4).max(8),
});

// =============================================================================
// PHOTO & ASSETS
// =============================================================================

export const CullingStatusSchema = z.enum(['Selected', 'Rejected', 'Pending']);
export const ProofingStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const ManualEditsSchema = z.object({
  _v: z.number().optional(),
  exposure: z.number().min(-100).max(100).default(0),
  contrast: z.number().min(-100).max(100).default(0),
  highlights: z.number().min(-100).max(100).default(0),
  shadows: z.number().min(-100).max(100).default(0),
  saturate: z.number().min(-100).max(100).default(0),
  vibrance: z.number().min(-100).max(100).default(0),
  grayscale: z.number().min(0).max(100).default(0),
  sepia: z.number().min(0).max(100).default(0),
  invert: z.number().min(0).max(100).default(0),
  hueRotate: z.number().min(-180).max(180).default(0),
  temperature: z.number().min(-100).max(100).default(0),
  tint: z.number().min(-100).max(100).default(0),
  whites: z.number().min(-100).max(100).default(0),
  blacks: z.number().min(-100).max(100).default(0),
  soften: z.number().min(0).max(100).default(0),
  rotate: z.number().min(-360).max(360).default(0),
  straighten: z.number().min(-45).max(45).default(0),
  perspectiveX: z.number().min(-100).max(100).default(0),
  perspectiveY: z.number().min(-100).max(100).default(0),
  clarity: z.number().min(-100).max(100).default(0),
  dropShadow: z.number().min(0).max(100).default(0),
  sharpen: z.number().min(0).max(100).optional(),
  vignette: z.number().min(0).max(100).optional(),
  brightness: z.number().min(-100).max(100).optional(),
  crop: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
});

export const PhotoSchema = z.object({
  id: z.string(),
  albumId: z.string(),
  url: z.string().url(),
  watermarkUrl: z.string().url().optional(),
  originalUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().max(255).optional(),
  photographerId: z.union([z.string(), z.number()]),
  category: z.string().max(100).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  resolution: z.number().positive().optional(),
  size: z.number().nonnegative().optional(),
  capturedAt: z.string().optional(),
  hotelId: z.string().optional(),
  mimeType: z.string().optional(),
  cullingStatus: CullingStatusSchema.optional(),
  proofingStatus: ProofingStatusSchema.optional(),
  manualEdits: ManualEditsSchema.optional().nullable(),
  autoEdits: ManualEditsSchema.optional().nullable(),
  autoEnhanced: z.boolean().optional(),
  originalFilename: z.string().max(500).optional(),
  fileHash: z.string().optional(),
  storagePath: z.string().optional(),
});

export const PhotoCreateSchema = z.object({
  albumId: z.string(),
  url: z.string().url(),
  photographerId: z.union([z.string(), z.number()]),
  title: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  originalFilename: z.string().max(500).optional(),
  mimeType: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  capturedAt: z.string().optional(),
  hotelId: z.string().optional(),
});

export const PhotoUpdateSchema = PhotoCreateSchema.partial();

export const PhotoBatchUpdateSchema = z.object({
  photoIds: z.array(z.string()).min(1).max(500),
  updates: PhotoUpdateSchema,
});

// =============================================================================
// ALBUMS
// =============================================================================

export const AlbumStatusSchema = z.enum(['Draft', 'Finalized', 'Archived']);

export const AlbumSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255),
  date: z.string(),
  photographerId: z.union([z.string(), z.number()]),
  roomNumber: z.string().max(50).optional(),
  source: z.string().optional(),
  eventType: z.string().max(100).optional(),
  status: AlbumStatusSchema.optional(),
  customerEmail: z.string().email().optional(),
  coverPhotoUrl: z.string().url().optional(),
});

export const AlbumCreateSchema = z.object({
  title: z.string().min(1).max(255),
  date: z.string(),
  photographerId: z.union([z.string(), z.number()]),
  roomNumber: z.string().max(50).optional(),
  source: z.string().optional(),
  eventType: z.string().max(100).optional(),
  customerEmail: z.string().email().optional(),
});

export const AlbumUpdateSchema = AlbumCreateSchema.partial();

// =============================================================================
// CART & ORDERS
// =============================================================================

export const DeliveryTypeSchema = z.enum(['digital', 'print', 'both']);
export const OrderStatusSchema = z.enum(['Completed', 'Pending', 'Processing', 'Cancelled', 'Delivered']);
export const PaymentMethodSchema = z.enum(['Cash', 'Card']);
export const OrderSourceSchema = z.enum(['kiosk', 'manual']);

export const CartItemSchema = z.object({
  id: z.string(),
  photoId: z.string(),
  name: z.string().min(1).max(255),
  format: z.string().max(100).optional(),
  quantity: z.number().int().positive().max(999),
  price: z.number().nonnegative(),
  deliveryType: DeliveryTypeSchema.optional(),
  productId: z.string().optional(),
});

export const CartItemCreateSchema = CartItemSchema.omit({ id: true });

export const OrderItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  format: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  deliveryType: DeliveryTypeSchema.optional(),
  productId: z.string().optional(),
  checksum: z.string().optional(),
});

export const OrderSchema = z.object({
  id: z.string(),
  date: z.string(),
  clientName: z.string().min(1).max(255),
  email: z.string().email(),
  status: OrderStatusSchema,
  total: z.number().nonnegative(),
  photographerId: z.union([z.string(), z.number()]),
  items: z.array(OrderItemSchema),
  appliedDiscount: z.number().min(0).max(100).optional(),
  destinationId: z.string().optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  albumId: z.string().optional(),
  source: OrderSourceSchema.optional(),
  roomNumber: z.string().max(50).optional(),
  rfidTag: z.string().optional(),
  orderNumber: z.string().optional(),
});

export const OrderCreateSchema = z.object({
  date: z.string(),
  clientName: z.string().min(1).max(255),
  email: z.string().email(),
  status: OrderStatusSchema.default('Pending'),
  total: z.number().nonnegative(),
  photographerId: z.union([z.string(), z.number()]),
  items: z.array(CartItemCreateSchema).min(1),
  appliedDiscount: z.number().min(0).max(100).optional(),
  destinationId: z.string().optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  albumId: z.string().optional(),
  source: OrderSourceSchema.optional(),
  roomNumber: z.string().max(50).optional(),
});

export const OrderUpdateSchema = OrderCreateSchema.partial();

// =============================================================================
// PRODUCTS & PRICING
// =============================================================================

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
});

export const ProductCreateSchema = ProductSchema.omit({ id: true });
export const ProductUpdateSchema = ProductCreateSchema.partial();

export const SessionTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  numberOfPhotos: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const CurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
  symbol: z.string().min(1).max(5),
  rate: z.number().positive(),
});

// =============================================================================
// BOOKINGS
// =============================================================================

export const BookingStatusSchema = z.enum(['confirmed', 'pending', 'cancelled', 'completed', 'no-show']);

export const BookingSchema = z.object({
  id: z.string(),
  clientName: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  date: z.string(),
  time: z.string(),
  sessionTypeId: z.string().optional(),
  photographerId: z.union([z.string(), z.number()]).optional(),
  status: BookingStatusSchema.default('pending'),
  notes: z.string().max(2000).optional(),
  roomNumber: z.string().max(50).optional(),
  destinationId: z.string().optional(),
});

export const BookingCreateSchema = BookingSchema.omit({ id: true });
export const BookingUpdateSchema = BookingCreateSchema.partial();

// =============================================================================
// CLIENT
// =============================================================================

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  roomNumber: z.string().max(50).optional(),
  rfidTag: z.string().optional(),
  totalOrders: z.number().int().nonnegative().optional(),
  totalSpent: z.number().nonnegative().optional(),
  lastVisit: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const ClientCreateSchema = ClientSchema.omit({ id: true, totalOrders: true, totalSpent: true, lastVisit: true });

// =============================================================================
// DESTINATIONS & SYSTEM
// =============================================================================

export const DestinationTypeSchema = z.enum(['Resort', 'City']);
export const DestinationStatusSchema = z.enum(['Online', 'Offline', 'Connected', 'Disconnected', 'Degraded']);

export const DestinationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  country: z.string().min(1).max(100),
  type: DestinationTypeSchema,
  licenseKey: z.string().optional(),
  status: DestinationStatusSchema.optional(),
  lastSeen: z.string().optional(),
  version: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const KioskStatusSchema = z.enum(['Active', 'Inactive', 'Maintenance', 'Connected', 'Disconnected']);

export const TouchKioskSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  status: KioskStatusSchema,
  lastHeartbeat: z.string().optional(),
  ipAddress: z.string().optional(),
  version: z.string().optional(),
});

// =============================================================================
// SYNC & LOGS
// =============================================================================

export const SyncLogLevelSchema = z.enum(['info', 'warn', 'error']);

export const SyncLogSchema = z.object({
  id: z.string(),
  masterId: z.string(),
  destinationId: z.string().optional(),
  level: SyncLogLevelSchema,
  event: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

// =============================================================================
// API RESPONSE
// =============================================================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  });

// =============================================================================
// LICENSE KEY
// =============================================================================

export const LicenseKeySchema = z.object({
  key: z.string().min(32).max(512),
  studioName: z.string().min(1).max(255),
  hardwareId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  features: z.array(z.string()).optional(),
  tier: z.enum(['starter', 'professional', 'enterprise']).default('professional'),
});

// =============================================================================
// INFERRED TYPES
// =============================================================================

export type Photo = z.infer<typeof PhotoSchema>;
export type PhotoCreate = z.infer<typeof PhotoCreateSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type AlbumCreate = z.infer<typeof AlbumCreateSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderCreate = z.infer<typeof OrderCreateSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type BookingCreate = z.infer<typeof BookingCreateSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type TouchKiosk = z.infer<typeof TouchKioskSchema>;
export type SyncLog = z.infer<typeof SyncLogSchema>;
export type SessionType = z.infer<typeof SessionTypeSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type LicenseKey = z.infer<typeof LicenseKeySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type ManualEdits = z.infer<typeof ManualEditsSchema>;
