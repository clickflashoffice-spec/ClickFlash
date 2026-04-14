// backend/shared/validation.ts
import { z } from 'zod';

// Login validation schema
const loginSchema = z.object({
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

// Common fields for all records
const commonFields = {
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
};

// User/Photographer validation schema
export const userSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().min(1, 'Name is required'),
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
    password: z.string().optional(),
    specialty: z.string().optional(),
    avatarUrl: z.string().optional().refine(
        (val) => !val || val === '' || val.startsWith('http') || val.startsWith('data:') || val.startsWith('/'),
        { message: 'Avatar URL must be a valid URL, data URL, or empty string' }
    ),
    role: z.enum(['CEO', 'Manager', 'Team Leader', 'Admin', 'Photographer']),
    monthlyTarget: z.number().min(0).optional(),
    dailyPhotoTarget: z.number().min(0).optional(),
    workingHours: z.any().optional(),
    payrollType: z.enum(['Salary', 'Commission']).optional(),
    monthlySalary: z.number().min(0).optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    destinationId: z.string().optional(),
    ...commonFields
});

// Album validation schema
export const albumSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
    photographerId: z.union([z.number().int().positive(), z.string(), z.null()]).optional().refine(
        (val) => {
            if (!val) return true;
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return !isNaN(parsed) && parsed > 0;
            }
            return true;
        },
        { message: 'Photographer ID must be a positive number' }
    ),
    roomNumber: z.string().max(50, 'Room number is too long').optional(),
    source: z.string().max(100, 'Source is too long').optional(),
    eventType: z.string().max(100, 'Event type is too long').optional(),
    status: z.enum(['Draft', 'Finalized', 'Archived']).optional(),
    categories: z.array(z.string()).max(50, 'Too many categories').optional(),
    customerEmail: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format').optional().or(z.literal('')),
    coverPhotoUrl: z.string().max(500, 'Cover photo URL is too long').optional(),
    ...commonFields
});

// Customer PII schema — used as JSON column in orders.customer
export const customerSchema = z.object({
    name:      z.string().max(200).optional(),
    email:     z.string().email().max(254).optional().or(z.literal('')),
    phone:     z.string().max(30).optional(),
    roomNumber: z.string().max(50).optional(),
}).passthrough(); // allow extension fields without breaking existing data

// Photo metadata schema — used as JSON column in photos.metadata
export const photoMetadataSchema = z.object({
    width:          z.number().int().positive().optional(),
    height:         z.number().int().positive().optional(),
    format:         z.string().max(20).optional(),
    size:           z.number().int().nonnegative().optional(),
    orientation:    z.number().int().optional(),
    customer_email: z.string().email().max(254).nullable().optional(),
    customer_name:  z.string().max(200).nullable().optional(),
    gps:            z.null().optional(), // GPS must always be stripped
}).passthrough();

// Order item validation schema
export const orderItemSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Item name is required'),
    format: z.string().optional(),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().min(0, 'Price must be non-negative'),
    photoId: z.string().optional(),
    url: z.string().optional()
}).passthrough();

// Order validation schema
export const orderSchema = z.object({
    id: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
    clientName: z.string().max(200, 'Client name is too long').nullable().optional(),
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format').nullable().optional().or(z.literal('')),
    status: z.enum(['Completed', 'Pending', 'Processing', 'Cancelled', 'Delivered']).optional(),
    total: z.number().min(0, 'Total must be non-negative').max(999999.99, 'Total is too large').optional(),
    photographerId: z.union([z.number().int().positive(), z.string()]).optional().refine(
        (val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return !isNaN(parsed) && parsed > 0;
            }
            return true;
        },
        { message: 'Photographer ID must be a positive number' }
    ),
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    customer: customerSchema.optional(),
    appliedDiscount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').optional(),
    destinationId: z.string().optional(),
    paymentMethod: z.enum(['Cash', 'Card']).nullable().optional(),
    albumId: z.string().nullable().optional(),
    orderNumber: z.string().nullable().optional(),
    roomNumber: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    customerEmail: z.string().nullable().optional(),
    paymentIntentId: z.string().nullable().optional(),
    kioskId: z.string().nullable().optional(),
    ...commonFields
}).passthrough();

// ManualEdits validation schema
const manualEditsSchema = z.object({
    exposure: z.number().min(-100).max(100).optional(),
    contrast: z.number().min(-100).max(100).optional(),
    highlights: z.number().min(-100).max(100).optional(),
    shadows: z.number().min(-100).max(100).optional(),
    saturate: z.number().min(-100).max(100).optional(),
    vibrance: z.number().min(-100).max(100).optional(),
    grayscale: z.number().min(0).max(100).optional(),
    sepia: z.number().min(0).max(100).optional(),
    invert: z.number().min(0).max(100).optional(),
    hueRotate: z.number().min(0).max(360).optional(),
    temperature: z.number().min(-100).max(100).optional(),
    tint: z.number().min(-100).max(100).optional(),
    whites: z.number().min(0).max(100).optional(),
    blacks: z.number().min(0).max(100).optional(),
    soften: z.number().min(0).max(20).optional(),
    rotate: z.number().min(-180).max(180).optional(),
    straighten: z.number().min(-15).max(15).optional(),
    perspectiveX: z.number().min(-50).max(50).optional(),
    perspectiveY: z.number().min(-50).max(50).optional(),
    clarity: z.number().min(0).max(100).optional(),
    dropShadow: z.number().min(0).max(100).optional()
}).passthrough();

// Photo validation schema
export const photoSchema = z.object({
    id: z.string().optional(),
    albumId: z.string().min(1, 'Album ID is required'),
    title: z.string().optional(),
    url: z.string().or(z.any()),
    photographerId: z.union([z.number().int().min(0), z.string()]).optional(),
    category: z.string().optional(),
    roomNumber: z.string().optional(),
    originalFilename: z.string().optional(),
    fileSize: z.number().int().optional(),
    mimeType: z.string().optional(),
    width: z.number().int().optional().or(z.null()),
    height: z.number().int().optional().or(z.null()),
    fileHash: z.string().optional(),
    storagePath: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    tinyUrl: z.string().optional(),
    previewUrl: z.string().optional(),
    sync_status: z.string().optional(),
    sync_id: z.string().optional(),
    quality_flags: z.string().optional(),
    metadata: photoMetadataSchema.optional().or(z.null()),
    manualEdits: manualEditsSchema.optional().or(z.null()),
    ...commonFields
}).passthrough();

// Kiosk validation schema
export const kioskSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    status: z.enum(['Active', 'Inactive', 'Maintenance', 'Connected', 'Disconnected']).optional(),
    lastHeartbeat: z.string().or(z.date()).optional(),
    settings: z.any().optional(),
    uploadFolderPath: z.string().optional(),
    ordersFolderPath: z.string().optional(),
    ...commonFields
});

// Product validation schema
export const productSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    category: z.string().optional(),
    price: z.number().min(0, 'Price must be non-negative'),
    stock: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional().or(z.number().min(0).max(1)),
    ...commonFields
});

// Settings validation schema
export const settingSchema = z.object({
    id: z.string().optional(),
    key: z.string().min(1, 'Key is required'),
    value: z.any().optional(),
    ...commonFields
});

// Destination validation schema
export const destinationSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    country: z.string().min(1, 'Country is required'),
    type: z.enum(['Resort', 'City']),
    licenseKey: z.string().optional(),
    ...commonFields
});

// Daily Objective validation schema
export const dailyObjectiveSchema = z.object({
    id: z.string().optional(),
    photographer_id: z.union([z.string(), z.number()]).transform(val => String(val).replace(/\.0$/, '')),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
    target: z.number().int().min(0),
    status: z.enum(['Pending', 'Completed']).optional(),
    ...commonFields
});

export const VALIDATION_SCHEMAS: Record<string, z.ZodObject<any>> = {
    users: userSchema,
    photographers: userSchema,
    albums: albumSchema,
    orders: orderSchema,
    photos: photoSchema,
    products: productSchema,
    kiosks: kioskSchema,
    settings: settingSchema,
    destinations: destinationSchema,
    daily_objectives: dailyObjectiveSchema
};

export interface ValidationResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: any[];
}

export function validateRequest(data: any, tableName: string, isUpdate: boolean = false): ValidationResult {
    const schema = VALIDATION_SCHEMAS[tableName];
    if (!schema) return { success: true, data };
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { success: false, error: 'Invalid request data', details: [{ path: 'root', message: 'Data must be an object' }] };
    }

    try {
        const preprocessedData = { ...data };
        Object.keys(preprocessedData).forEach(key => {
            // Convert null to undefined for optional fields to allow them to be truly optional
            if (preprocessedData[key] === null) {
                preprocessedData[key] = undefined;
            }
        });

        const schemaToUse = isUpdate ? schema.partial() : schema;
        const validated = schemaToUse.parse(preprocessedData);
        return { success: true, data: validated };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            console.log("VALIDATION FAILED", tableName, JSON.stringify(error.issues, null, 2));
            return { success: false, error: `Validation failed`, details: error.issues };
        }
        return { success: false, error: 'Validation error: ' + (error.message || String(error)) };
    }
}

export function validateLogin(data: any): ValidationResult {
    try {
        const validated = loginSchema.parse(data);
        return { success: true, data: validated };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: `Validation failed`, details: error.issues };
        }
        return { success: false, error: 'Validation error: ' + (error.message || String(error)) };
    }
}
