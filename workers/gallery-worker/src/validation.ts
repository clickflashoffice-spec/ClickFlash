import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

// User/Photographer validation schema
export const userSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
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
    destinationId: z.string().optional()
});

// Album validation schema
export const albumSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
    photographerId: z.number().int().positive(),
    roomNumber: z.string().optional(),
    source: z.string().optional(),
    eventType: z.string().optional(),
    status: z.enum(['Draft', 'Finalized', 'Archived']).optional(),
    categories: z.array(z.string()).optional()
});

// Order item validation schema
export const orderItemSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Item name is required'),
    format: z.string().optional(),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().min(0, 'Price must be non-negative')
});

// Order validation schema
export const orderSchema = z.object({
    id: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
    clientName: z.string().min(1, 'Client name is required'),
    email: z.string().email('Invalid email format'),
    status: z.enum(['Completed', 'Pending', 'Processing', 'Cancelled', 'Delivered']),
    total: z.number().min(0, 'Total must be non-negative'),
    photographerId: z.number().int().positive(),
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    appliedDiscount: z.number().min(0).max(100).optional(),
    destinationId: z.string().optional(),
    paymentMethod: z.enum(['Cash', 'Card']).optional()
});

// Photo validation schema
export const photoSchema = z.object({
    id: z.string().optional(),
    albumId: z.string().min(1, 'Album ID is required'),
    title: z.string().optional(),
    url: z.string().or(z.any()),
    photographerId: z.union([z.number().int().positive(), z.string()]).optional(),
    category: z.string().optional(),
    manualEdits: z.any().optional()
});

// Kiosk validation schema
export const kioskSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    status: z.enum(['Active', 'Inactive', 'Maintenance', 'Connected', 'Disconnected']).optional(),
    lastHeartbeat: z.string().or(z.date()).optional(),
    settings: z.any().optional()
});

// Product validation schema
export const productSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    category: z.string().optional(),
    price: z.number().min(0, 'Price must be non-negative'),
    stock: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional().or(z.number().min(0).max(1))
});

// Settings validation schema
export const settingSchema = z.object({
    id: z.string().optional(),
    key: z.string().min(1, 'Key is required'),
    value: z.any().optional()
});

// Validation schemas by collection/table name
export const VALIDATION_SCHEMAS: Record<string, z.ZodSchema> = {
    users: userSchema,
    photographers: userSchema,
    albums: albumSchema,
    orders: orderSchema,
    photos: photoSchema,
    products: productSchema,
    kiosks: kioskSchema,
    settings: settingSchema
};

/**
 * Validate request body against schema
 */
export function validateRequest(data: any, tableName: string, isUpdate = false) {
    const schema = VALIDATION_SCHEMAS[tableName];

    if (!schema) {
        return { success: true, data };
    }

    try {
        const preprocessedData = { ...data };
        if (tableName === 'users' || tableName === 'photographers') {
            const numericFields = ['monthlySalary', 'commissionRate', 'monthlyTarget', 'dailyPhotoTarget'];
            numericFields.forEach(field => {
                if (preprocessedData[field] === null) {
                    delete preprocessedData[field];
                }
            });
        }

        const schemaToUse = isUpdate ? (schema as z.ZodObject<any>).partial() : schema;
        const validated = schemaToUse.parse(preprocessedData);
        return { success: true, data: validated };
    } catch (error: any) {
        if (error instanceof z.ZodError && error.errors) {
            const errorMessages = error.errors.map(e => {
                const path = e.path && e.path.length > 0 ? e.path.join('.') : 'root';
                return `${path}: ${e.message}`;
            }).join(', ');
            return {
                success: false,
                error: `Validation failed: ${errorMessages}`,
                details: error.errors
            };
        }
        return {
            success: false,
            error: 'Validation error: ' + (error.message || String(error))
        };
    }
}

/**
 * Validate login request
 */
export const createPaymentIntentSchema = z.object({
    orderId: z.string().min(1, 'orderId is required'),
    amount: z.number().int().positive('amount must be a positive integer (cents)'),
    currency: z.string().length(3, 'currency must be a 3-letter ISO code').default('eur'),
    email: z.string().email('Invalid email format').optional(),
    tipAmount: z.number().int().nonnegative().optional(),
});

export const createCheckoutSessionSchema = z.object({
    amount: z.number().int().positive('amount must be a positive integer (cents)'),
    currency: z.string().length(3, 'currency must be a 3-letter ISO code').default('eur'),
    email: z.string().email('Invalid email format').optional(),
    metadata: z.record(z.string()).optional(),
    paymentMethodTypes: z.array(z.string()).optional(),
    enableWallets: z.boolean().optional(),
    mode: z.enum(['payment', 'subscription']).default('payment'),
});

export const getPaymentMethodsSchema = z.object({
    customerId: z.string().min(1, 'customerId is required'),
});

export function validateLogin(data: any) {
    try {
        const validated = loginSchema.parse(data);
        return { success: true, data: validated };
    } catch (error: any) {
        if (error instanceof z.ZodError && error.errors) {
            const errorMessages = error.errors.map(e => {
                const path = e.path && e.path.length > 0 ? e.path.join('.') : 'root';
                return `${path}: ${e.message}`;
            }).join(', ');
            return {
                success: false,
                error: `Validation failed: ${errorMessages}`,
                details: error.errors
            };
        }
        return {
            success: false,
            error: 'Validation error: ' + (error.message || String(error))
        };
    }
}
