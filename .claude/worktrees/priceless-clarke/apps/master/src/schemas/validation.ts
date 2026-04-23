/**
 * Input Validation Schemas
 * 
 * Zod schemas for form validation across the Master App.
 * Ensures type safety and data integrity.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const IdSchema = z.string().uuid();

export const EmailSchema = z.string().email('Invalid email address');

export const PasswordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');

export const PhoneSchema = z.string().regex(
    /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    'Invalid phone number'
);

// ============================================================================
// Album Schemas
// ============================================================================

export const AlbumCreateSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    photographerId: z.string().min(1, 'Photographer is required'),
    roomNumber: z.string().optional(),
    categories: z.array(z.string()).optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
});

export const AlbumUpdateSchema = AlbumCreateSchema.partial().extend({
    id: IdSchema,
    status: z.enum(['Draft', 'Finalized', 'Archived']).optional(),
});

// ============================================================================
// Photo Schemas
// ============================================================================

export const PhotoUploadSchema = z.object({
    albumId: IdSchema,
    files: z.array(z.instanceof(File)).min(1, 'At least one file required'),
    photographerId: z.string().optional(),
});

export const PhotoEditSchema = z.object({
    photoId: IdSchema,
    title: z.string().max(200).optional(),
    manualEdits: z.object({
        brightness: z.number().min(-100).max(100).optional(),
        contrast: z.number().min(-100).max(100).optional(),
        saturation: z.number().min(-100).max(100).optional(),
        crop: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
        }).optional(),
    }).optional(),
});

// ============================================================================
// Order Schemas
// ============================================================================

export const OrderItemSchema = z.object({
    productId: z.string(),
    photoId: z.string().optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    price: z.number().min(0, 'Price cannot be negative'),
});

export const OrderCreateSchema = z.object({
    clientName: z.string().min(1, 'Client name is required').max(100),
    email: EmailSchema,
    phone: PhoneSchema.optional(),
    items: z.array(OrderItemSchema).min(1, 'At least one item required'),
    albumId: IdSchema.optional(),
    discount: z.number().min(0).max(100).optional(),
    notes: z.string().max(500).optional(),
});

export const OrderUpdateSchema = OrderCreateSchema.partial().extend({
    id: IdSchema,
    status: z.enum(['Pending', 'Processing', 'Completed', 'Cancelled', 'Refunded']).optional(),
});

// ============================================================================
// Product Schemas
// ============================================================================

export const ProductCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    price: z.number().min(0, 'Price cannot be negative'),
    category: z.string().min(1, 'Category is required'),
    stock: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional(),
});

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
    id: IdSchema,
});

// ============================================================================
// Photographer Schemas
// ============================================================================

export const PhotographerCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: EmailSchema,
    phone: PhoneSchema.optional(),
    role: z.enum(['admin', 'photographer', 'assistant']).default('photographer'),
    commissionRate: z.number().min(0).max(100).optional(),
});

export const PhotographerUpdateSchema = PhotographerCreateSchema.partial().extend({
    id: IdSchema,
});

// ============================================================================
// Settings Schemas
// ============================================================================

export const KioskSettingsSchema = z.object({
    kioskId: z.string().min(1, 'Kiosk ID is required'),
    welcomeMessage: z.string().max(200).optional(),
    screensaverTimeout: z.number().int().min(10).max(300).default(60),
    enableRFID: z.boolean().default(false),
    enableFaceLogin: z.boolean().default(true),
    enableFaceSearch: z.boolean().default(true),
});

export const CloudSettingsSchema = z.object({
    url: z.string().url('Invalid URL').optional(),
    apiKey: z.string().optional(),
    syncEnabled: z.boolean().default(false),
    autoSync: z.boolean().default(false),
    syncInterval: z.number().int().min(1).max(60).default(30),
});

// ============================================================================
// Campaign Schemas
// ============================================================================

export const CampaignCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    subject: z.string().min(1, 'Subject is required').max(200),
    bodyHtml: z.string().min(1, 'Body is required'),
    recipientList: z.array(EmailSchema).min(1, 'At least one recipient required'),
    scheduledAt: z.string().datetime().optional(),
});

// ============================================================================
// Export Types
// ============================================================================

export type AlbumCreateInput = z.infer<typeof AlbumCreateSchema>;
export type AlbumUpdateInput = z.infer<typeof AlbumUpdateSchema>;
export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type OrderUpdateInput = z.infer<typeof OrderUpdateSchema>;
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type PhotographerCreateInput = z.infer<typeof PhotographerCreateSchema>;
export type PhotographerUpdateInput = z.infer<typeof PhotographerUpdateSchema>;
export type KioskSettingsInput = z.infer<typeof KioskSettingsSchema>;
export type CloudSettingsInput = z.infer<typeof CloudSettingsSchema>;
export type CampaignCreateInput = z.infer<typeof CampaignCreateSchema>;
