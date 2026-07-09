// backend/shared/validation.ts
import { z } from 'zod';
import { logger } from '../utils/logger';

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
    payload: z.record(z.string(), z.any()).optional(),
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
            if (!val && val !== 0) return true;
            if (typeof val === 'number') return Number.isFinite(val) && val > 0;
            // Allow any non-empty string including UUIDs (users table uses UUID IDs)
            if (typeof val === 'string') return val.trim().length > 0;
            return true;
        },
        { message: 'Photographer ID must be a valid ID' }
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
            if (!val && val !== 0) return true;
            if (typeof val === 'number') return Number.isFinite(val) && val > 0;
            // Allow any non-empty string including UUIDs (users table uses UUID IDs)
            if (typeof val === 'string') return val.trim().length > 0;
            return true;
        },
        { message: 'Photographer ID must be a valid ID' }
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
    tipAmount: z.number().min(0, 'Tip amount must be non-negative').optional(),
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
    autoEdits: manualEditsSchema.optional().or(z.null()),
    autoEnhanced: z.boolean().or(z.number().min(0).max(1)).optional(),
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

// Custom Route Schemas
export const customRoutesSchemas = {
    orderLogin: z.object({
        orderId: z.string().min(1, 'Order ID is required'),
        customerEmail: z.string().email('Invalid email address')
    }),
    magicLink: z.object({
        albumId: z.string().min(1, 'Album ID is required'),
        customerEmail: z.string().email('Invalid email address')
    }),
    kioskOrder: z.object({
        clientMutationId: z.string().min(1, 'clientMutationId is required'),
        clientDeviceId: z.string().optional(),
        items: z.array(orderItemSchema).min(1, 'At least one item is required'),
        clientName: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        total: z.number().min(0).optional(),
        status: z.string().optional(),
        date: z.string().optional(),
        destinationId: z.string().optional(),
        photographerId: z.union([z.string(), z.number()]).optional(),
        roomNumber: z.string().optional(),
        appliedDiscount: z.number().optional(),
        tipAmount: z.number().min(0).optional()
    }),
    verifyPin: z.object({
        pin: z.string().min(1, 'pin is required')
    }),
    galleryCheckout: z.object({
        items: z.array(z.object({
            id: z.string().min(1),
            title: z.string().min(1),
            price: z.number().nonnegative(),
            quantity: z.number().int().positive(),
            type: z.string().min(1)
        })).min(1, "Cart is empty"),
        tipAmount: z.number().min(0).optional()
    }),
    pairingExchange: z.object({
        kiosk_id: z.string().regex(/^KIOSK_[A-Z0-9_]{3,32}$/),
        nonce: z.string().min(20).max(128),
        signature: z.string().min(40).max(128),
        hardware_fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
        tenant_id: z.string().min(1).max(64).optional(),
    }),
    cullingConfirm: z.object({
        actions: z.object({
            mode: z.enum(['archive', 'delete']).optional()
        }).optional(),
        mode: z.enum(['archive', 'delete']).optional()
    }),
    marketingCampaign: z.object({
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['post-event', 'abandoned-cart', 're-engagement', 'retention']),
        triggerEvent: z.string().min(1, 'Trigger event is required'),
        delayMinutes: z.number().int().min(0),
        subjectTemplate: z.string().min(1, 'Subject template is required'),
        bodyTemplate: z.string().min(1, 'Body template is required'),
        bodyText: z.string().optional(),
        isActive: z.union([z.boolean(), z.number()]).optional()
    }),
    testEmail: z.object({
        campaignId: z.string().min(1, 'campaignId is required'),
        to: z.string().email('Invalid email')
    }),
    logMeeting: z.object({
        photographerId: z.union([z.string(), z.number()]),
        type: z.string().min(1, 'Type is required'),
        date: z.string().optional()
    }),
    operationalStats: z.object({
        date: z.string().min(1, 'Date is required'),
        total_guests: z.union([z.string(), z.number()]),
        departures: z.union([z.string(), z.number()])
    }),
    logSession: z.object({
        photographerId: z.union([z.string(), z.number()]),
        seconds: z.union([z.string(), z.number()]),
        date: z.string().optional()
    }),
    triggerAutoCalc: z.object({
        date: z.string().optional()
    }),
    sessionType: z.object({
        name: z.string().min(1, 'Name is required'),
        numberOfPhotos: z.number().optional(),
        price: z.number().optional()
    }),
    setupRollback: z.object({
        cloudflareApiToken: z.string().min(1, 'Cloudflare API token is required for rollback'),
        locationName: z.string().optional()
    }),
    setupValidateCloudflare: z.object({
        apiToken: z.string().min(1, 'API token is required'),
        accountId: z.string().min(1, 'Account ID is required')
    }),
    setupTestConnection: z.object({
        hubUrl: z.string().url().optional()
    }),
    hardwarePrint: z.object({
        printer: z.string().min(1, 'Printer name is required'),
        photoPath: z.string().optional()
    }),
    kioskHeartbeat: z.object({
        kioskId: z.union([z.string(), z.number()]),
        status: z.string().optional()
    }),
    maintenanceCleanup: z.object({
        masterImportRetentionDays: z.union([z.string(), z.number()]).optional()
    }),
    networkPing: z.object({
        clientTimestamp: z.number().optional()
    }),
    networkSettings: z.object({
        masterLocalIp: z.string().optional(),
        touchSharedImportFolder: z.string().optional(),
        connectionMode: z.enum(['standalone', 'network']).optional(),
        deskId: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().or(z.literal('')),
        deskName: z.string().optional(),
        deskLocation: z.string().optional(),
        cloudUrl: z.string().url().optional().or(z.literal('')),
        cloudEmail: z.string().email().optional().or(z.literal('')),
        cloudPassword: z.string().optional(),
        deskToken: z.string().optional(),
        galleryUrl: z.string().url().optional().or(z.literal('')),
        galleryApiKey: z.string().optional(),
        moneytrash: z.object({
            enabled: z.boolean().optional(),
            retentionDays: z.number().min(1).max(365).optional(),
            price: z.string().optional(),
            watermarkEnabled: z.boolean().optional(),
            watermarkOpacity: z.number().min(0).max(100).optional(),
        }).optional(),
    }).catchall(z.any()),
    operationsDataRefresh: z.object({
        collections: z.array(z.string()).optional()
    }),
    operationsKioskSendAlbum: z.object({
        albumId: z.string().min(1, 'Album ID is required'),
        kioskId: z.union([z.string(), z.number()]).optional(),
        photoIds: z.array(z.string()).optional(),
        metadataOnly: z.boolean().optional()
    }),
    operationsConfigImport: z.object({
        deskId: z.string().min(1, 'Desk ID is required'),
        cloudUrl: z.string().optional(),
        cloudEmail: z.string().optional(),
        moneytrash: z.any().optional()
    }),
    operationsEraseCustomerData: z.object({
        email: z.string().email('Valid customer email is required')
    }),
    operationsSettingsNamespace: z.any(),
    securityVerifyPin: z.object({
        pin: z.string().min(1, 'PIN is required')
    }),
    securityUpdatePin: z.object({
        currentPin: z.string().min(1, 'Current PIN is required'),
        newPin: z.string().min(1, 'New PIN is required')
    }),
    analyticsTrack: z.object({
        photoId: z.string().min(1, 'Photo ID is required'),
        type: z.enum(['view', 'selection'])
    }),
    assistanceRequest: z.object({
        kioskId: z.string().min(1, 'Kiosk ID is required'),
        message: z.string().min(1, 'Message is required'),
        priority: z.string().optional()
    }),
    cloudCandidatesAction: z.object({
        action: z.enum(['exclude', 'upload', 'delete'])
    }),
    ledgerAdjust: z.object({
        photographerId: z.string().min(1, 'Photographer ID is required'),
        type: z.enum(['Bonus', 'Deduction', 'Salary', 'Payout', 'Correction']),
        amount: z.union([z.number(), z.string()]),
        description: z.string().min(1, 'Description is required'),
        date: z.string().optional()
    }),
    ledgerBackfill: z.object({
        secret: z.string().min(1, 'Secret is required')
    }),
    ordersPrint: z.object({
        photoId: z.string().min(1, 'Photo ID is required'),
        printerName: z.string().optional()
    }),
    notificationCustomer: z.object({
        email: z.string().email('Valid email is required'),
        customerName: z.string().optional(),
        albumName: z.string().min(1, 'Album name is required'),
        accessCode: z.string().min(1, 'Access code is required'),
        url: z.string().url('Valid URL is required')
    })
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
            logger.info(`VALIDATION FAILED for ${tableName}`, { issues: error.issues });
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
