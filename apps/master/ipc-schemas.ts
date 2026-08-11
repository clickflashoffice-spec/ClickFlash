/**
 * ipc-schemas.ts — Zod validation schemas for IPC payloads
 *
 * Every IPC channel that handles structured data gets a Zod schema here.
 * The electron-main.ts handlers validate incoming payloads using these
 * schemas before passing them to Repository methods.
 */
import { z } from "zod";

// ─── Common Schemas ─────────────────────────────────────────────────────────

export const IdParam = z.object({
  id: z.string().uuid(),
});

export const PaginationParams = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(200).default(50),
  sort: z.string().optional(),
  filter: z.string().optional(),
});

// ─── Album Schemas ──────────────────────────────────────────────────────────

export const AlbumCreate = z.object({
  title: z.string().min(1).max(500),
  date: z.string().optional(),
  photographerId: z.string().optional(),
  roomNumber: z.string().optional(),
  status: z.enum(["draft", "active", "archived", "completed"]).default("draft"),
  source: z.string().optional(),
  categories: z.string().optional(), // JSON array stored as string
  eventType: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

export const AlbumUpdate = AlbumCreate.partial().extend({
  id: z.string().uuid(),
  kiosk_ready: z.union([z.boolean(), z.number()]).optional(),
  coverPhotoUrl: z.string().optional(),
});

// ─── Photo Schemas ──────────────────────────────────────────────────────────

export const PhotoCreate = z.object({
  albumId: z.string().uuid(),
  url: z.string(),
  title: z.string().optional(),
  photographerId: z.string().optional(),
  category: z.string().optional(),
  originalFilename: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  storagePath: z.string().optional(),
});

export const PhotoUpdate = PhotoCreate.partial().extend({
  id: z.string().uuid(),
  manualEdits: z.string().optional(),
  autoEdits: z.string().optional(),
  editMetadata: z.string().optional(),
  autoEnhanced: z.union([z.boolean(), z.number()]).optional(),
  cullingStatus: z.string().optional(),
  isFavorite: z.union([z.boolean(), z.number()]).optional(),
});

// ─── Order Schemas ──────────────────────────────────────────────────────────

export const OrderCreate = z.object({
  orderNumber: z.string().optional(),
  clientName: z.string().optional(),
  email: z.string().email().optional(),
  customer: z.string().optional(), // JSON object stored as string
  items: z.string(), // JSON array stored as string
  total: z.number().min(0),
  status: z.enum(["pending", "confirmed", "processing", "printing", "ready", "completed", "cancelled"]).default("pending"),
  paymentMethod: z.string().optional(),
  kioskId: z.string().optional(),
  photographerId: z.string().optional(),
  destinationId: z.string().optional(),
  albumId: z.string().optional(),
  roomNumber: z.string().optional(),
  source: z.string().optional(),
});

export const OrderUpdate = OrderCreate.partial().extend({
  id: z.string().uuid(),
});

// ─── User Schemas ───────────────────────────────────────────────────────────

export const UserCreate = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "photographer", "manager", "viewer"]).default("photographer"),
  destinationId: z.string().optional(),
  permissions: z.string().optional(), // JSON stored as string
  monthlyTarget: z.number().optional(),
  dailyPhotoTarget: z.number().optional(),
  specialty: z.string().optional(),
  payrollType: z.string().optional(),
  monthlySalary: z.number().optional(),
  commissionRate: z.number().optional(),
});

export const UserUpdate = UserCreate.partial().extend({
  id: z.string().uuid(),
  avatarUrl: z.string().optional(),
  workingHours: z.string().optional(),
});

// ─── Settings Schemas ───────────────────────────────────────────────────────

export const SettingUpsert = z.object({
  key: z.string().min(1).max(200),
  value: z.string(),
});

// ─── Product Schemas ────────────────────────────────────────────────────────

export const ProductCreate = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string().optional(),
  type: z.string().optional(),
  imageUrl: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  isFeatured: z.union([z.boolean(), z.number()]).optional(),
});

export const ProductUpdate = ProductCreate.partial().extend({
  id: z.string().uuid(),
});

// ─── IPC Request Envelope ───────────────────────────────────────────────────

/** The top-level envelope for repo:* IPC calls */
export const RepoRequest = z.object({
  collection: z.enum(["albums", "photos", "orders", "users", "settings", "products"]),
  action: z.enum(["findById", "findAll", "create", "update", "delete", "findByKey", "upsert", "findByStatus", "findByAlbumId", "findByPhotographerId", "findByRole", "findByEmail", "findByCategory", "findFeatured"]),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type RepoRequestType = z.infer<typeof RepoRequest>;
