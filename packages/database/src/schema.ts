/**
 * schema.ts — Drizzle ORM SQLite Schema for ClickFlash Ecosystem
 *
 * Universal typed schema definition for local SQLite databases across:
 * - Master OS (`apps/desktop/master`)
 * - Touch Kiosk (`apps/desktop/touch`)
 * - MoneyTrash (`apps/desktop/moneytrash`)
 *
 * Fully compatible with better-sqlite3 and better-sqlite3-multiple-ciphers.
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const destinations = sqliteTable('destinations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  active: integer('active').default(1),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const sessionTypes = sqliteTable('session_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  durationMinutes: integer('duration_minutes').default(30),
  price: real('price').default(0),
  currency: text('currency').default('USD'),
  active: integer('active').default(1),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user'), // 'admin' | 'manager' | 'photographer' | 'kiosk' | 'user'
  fullName: text('full_name'),
  deskId: integer('desk_id'),
  pin: text('pin'),
  active: integer('active').default(1),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: text('expires_at').notNull(),
  revoked: integer('revoked').default(0),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const kiosks = sqliteTable('kiosks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hardwareId: text('hardware_id').notNull().unique(),
  name: text('name'),
  ipAddress: text('ip_address'),
  port: integer('port').default(8091),
  status: text('status').default('offline'), // 'online' | 'offline' | 'busy'
  lastPing: text('last_ping'),
  firmwareVersion: text('firmware_version'),
  screenResolution: text('screen_resolution'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const albums = sqliteTable('albums', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  destinationId: integer('destination_id').notNull().references(() => destinations.id),
  sessionTypeId: integer('session_type_id').notNull().references(() => sessionTypes.id),
  photographerId: integer('photographer_id').references(() => users.id),
  guestName: text('guest_name'),
  guestEmail: text('guest_email'),
  guestPhone: text('guest_phone'),
  qrCode: text('qr_code'),
  status: text('status').default('ACTIVE'), // 'ACTIVE' | 'ARCHIVED' | 'PAID'
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const photos = sqliteTable('photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  albumId: integer('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  previewPath: text('preview_path'),
  fileSize: integer('file_size'),
  width: integer('width'),
  height: integer('height'),
  status: text('status').default('pending'), // 'pending' | 'processed' | 'error'
  syncStatus: text('sync_status').default('local'), // 'local' | 'synced' | 'failed'
  aiScore: real('ai_score'),
  sharpnessScore: real('sharpness_score'),
  compositionScore: real('composition_score'),
  expressionScore: real('expression_score'),
  isRejected: integer('is_rejected').default(0),
  isFavorite: integer('is_favorite').default(0),
  burstGroup: text('burst_group'),
  tags: text('tags', { mode: 'json' }), // string[]
  metadata: text('metadata', { mode: 'json' }), // EXIF data
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const faces = sqliteTable('faces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  photoId: integer('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  embedding: text('embedding', { mode: 'json' }).notNull(), // 512D or 128D float array
  boundingBox: text('bounding_box', { mode: 'json' }).notNull(), // { x, y, width, height }
  confidence: real('confidence').default(1.0),
  personClusterId: text('person_cluster_id'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  albumId: integer('album_id').notNull().references(() => albums.id),
  kioskId: integer('kiosk_id').references(() => kiosks.id),
  totalAmount: real('total_amount').notNull(),
  currency: text('currency').default('USD'),
  paymentMethod: text('payment_method').default('STRIPE'), // 'STRIPE' | 'CASH' | 'ROOM_CHARGE'
  paymentStatus: text('payment_status').default('PENDING'), // 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  items: text('items', { mode: 'json' }), // OrderItem[]
  customerEmail: text('customer_email'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const kioskTransferQueue = sqliteTable('kiosk_transfer_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  photoId: integer('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  kioskId: integer('kiosk_id').notNull().references(() => kiosks.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'), // 'pending' | 'in_transit' | 'completed' | 'failed'
  attempts: integer('attempts').default(0),
  lastAttemptAt: text('last_attempt_at'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: text('details', { mode: 'json' }),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});
