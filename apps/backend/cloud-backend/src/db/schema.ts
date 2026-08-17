import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const globalSettings = sqliteTable('global_settings', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default-tenant'),
  key: text('key').notNull().unique(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default-tenant'),
  resortId: text('resort_id').notNull(),
  photographerId: text('photographer_id').notNull(),
  guestName: text('guest_name'),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, PAID, DELIVERED
  syncStatus: text('sync_status').notNull().default('PENDING'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default-tenant'),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull(), // SUCCEEDED, FAILED
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const photographers = sqliteTable('photographers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default-tenant'),
  name: text('name').notNull(),
  stationId: text('station_id'),
  faceVector: text('face_vector', { mode: 'json' }),
  faceEnrolledAt: integer('face_enrolled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default-tenant'),
  photographerId: text('photographer_id').notNull(),
  type: text('type').notNull(), // CLOCK_IN, CLOCK_OUT
  timestamp: text('timestamp').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  biometricVerified: integer('biometric_verified').default(0),
  biometricMethod: text('biometric_method').default('LOCAL_AUTH'),
  biometricConfidence: real('biometric_confidence'),
  faceVectorHash: text('face_vector_hash'),
  stationId: text('station_id'),
});

