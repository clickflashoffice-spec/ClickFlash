const { z } = require('zod');

// Login validation schema
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
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
const userSchema = z.object({
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
    workingHours: z.any().optional(), // Complex object, validate structure if needed
    payrollType: z.enum(['Salary', 'Commission']).optional(),
    monthlySalary: z.number().min(0).optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    destinationId: z.string().optional(),
    ...commonFields
});

// Album validation schema
const albumSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
    photographerId: z.union([z.number().int().positive(), z.string()]).refine(
        (val) => {
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
    coverPhotoUrl: z.string().max(500, 'Cover photo URL is too long').optional(),
    ...commonFields
});

// Order item validation schema
const orderItemSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Item name is required'),
    format: z.string().optional(),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().min(0, 'Price must be non-negative')
});

// Order validation schema
const orderSchema = z.object({
    id: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
    clientName: z.string().min(1, 'Client name is required').max(200, 'Client name is too long'),
    email: z.string().email('Invalid email format').max(255, 'Email is too long'),
    status: z.enum(['Completed', 'Pending', 'Processing', 'Cancelled', 'Delivered']),
    total: z.number().min(0, 'Total must be non-negative').max(999999.99, 'Total is too large'),
    photographerId: z.union([z.number().int().positive(), z.string()]).refine(
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
    appliedDiscount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').optional(),
    destinationId: z.string().optional(),
    paymentMethod: z.enum(['Cash', 'Card']).optional(),
    albumId: z.string().optional(),
    ...commonFields
}).refine(
    (data) => {
        // Business rule: Total should match sum of items minus discount
        if (data.items && data.items.length > 0) {
            const calculatedTotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const discount = data.appliedDiscount || 0;
            const expectedTotal = Math.max(0, calculatedTotal - discount);
            // Allow small floating point differences
            return Math.abs(data.total - expectedTotal) < 0.01;
        }
        return true;
    },
    { message: 'Order total does not match sum of items minus discount' }
);

// Photo validation schema
const photoSchema = z.object({
    id: z.string().optional(),
    albumId: z.string().min(1, 'Album ID is required'),
    title: z.string().optional(), // Optional to match database schema
    url: z.string().or(z.any()), // Can be string URL or Blob
    photographerId: z.union([z.number().int().positive(), z.string()]).optional(),
    category: z.string().optional(),
    manualEdits: z.any().optional(), // Complex object
    ...commonFields
});

// Kiosk validation schema
const kioskSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    status: z.enum(['Active', 'Inactive', 'Maintenance', 'Connected', 'Disconnected']).optional(),
    lastHeartbeat: z.string().or(z.date()).optional(), // Accept string ISO or Date object
    settings: z.any().optional(),
    ...commonFields
});

// Product validation schema
const productSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    category: z.string().optional(),
    price: z.number().min(0, 'Price must be non-negative'),
    stock: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional().or(z.number().min(0).max(1)), // Handle boolean or sqlite 0/1
    ...commonFields
});

// Settings validation schema
const settingSchema = z.object({
    id: z.string().optional(),
    key: z.string().min(1, 'Key is required'),
    value: z.any().optional(),
    ...commonFields
});

// Validation schemas by collection/table name
const VALIDATION_SCHEMAS = {
    users: userSchema,
    photographers: userSchema, // Alias
    albums: albumSchema,
    orders: orderSchema,
    photos: photoSchema,
    products: productSchema,
    kiosks: kioskSchema,
    settings: settingSchema
};

/**
 * Validate request body against schema
 * 
 * Features:
 * - Handles null/undefined values gracefully
 * - Converts empty strings to undefined for optional fields
 * - Type coercion for numeric fields
 * - Partial validation for updates
 * - Comprehensive error messages
 * 
 * @param {Object} data - Request body data
 * @param {string} tableName - Table/collection name
 * @param {boolean} isUpdate - Whether this is an update operation (PATCH)
 * @returns {Object} - { success: boolean, data?: Object, error?: string, details?: Array }
 */
function validateRequest(data, tableName, isUpdate = false) {
    const schema = VALIDATION_SCHEMAS[tableName];

    if (!schema) {
        // No schema defined for this table - allow through (for flexibility)
        return { success: true, data };
    }

    // Validate input
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {
            success: false,
            error: 'Invalid request data: expected an object',
            details: [{ path: 'root', message: 'Data must be an object' }]
        };
    }

    try {
        // Preprocess data: handle null, empty strings, and type coercion
        const preprocessedData = { ...data };

        // Convert empty strings to undefined for optional string fields
        Object.keys(preprocessedData).forEach(key => {
            if (preprocessedData[key] === '') {
                // Only convert to undefined if field is optional (for updates)
                if (isUpdate) {
                    preprocessedData[key] = undefined;
                }
            }
            // Convert null to undefined for optional fields
            if (preprocessedData[key] === null && isUpdate) {
                preprocessedData[key] = undefined;
            }
        });

        // Handle numeric fields - convert null to undefined
        if (tableName === 'users' || tableName === 'photographers') {
            const numericFields = ['monthlySalary', 'commissionRate', 'monthlyTarget', 'dailyPhotoTarget'];
            numericFields.forEach(field => {
                if (preprocessedData[field] === null || preprocessedData[field] === '') {
                    delete preprocessedData[field];
                } else if (typeof preprocessedData[field] === 'string') {
                    // Try to parse string numbers
                    const parsed = parseFloat(preprocessedData[field]);
                    if (!isNaN(parsed)) {
                        preprocessedData[field] = parsed;
                    }
                }
            });
        }

        // Handle order total calculation if items are present
        if (tableName === 'orders' && preprocessedData.items && Array.isArray(preprocessedData.items)) {
            // Validate items array
            if (preprocessedData.items.length === 0 && !isUpdate) {
                return {
                    success: false,
                    error: 'Order must have at least one item',
                    details: [{ path: 'items', message: 'At least one item is required' }]
                };
            }

            // Calculate total from items if not provided or if items changed
            if (preprocessedData.items.length > 0) {
                const calculatedTotal = preprocessedData.items.reduce((sum, item) => {
                    const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                    const itemQuantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
                    return sum + (itemPrice * itemQuantity);
                }, 0);
                const discount = preprocessedData.appliedDiscount || 0;
                const finalTotal = Math.max(0, calculatedTotal - discount);

                // Update total if it doesn't match calculation
                if (!preprocessedData.total || Math.abs(preprocessedData.total - finalTotal) > 0.01) {
                    preprocessedData.total = finalTotal;
                }
            }
        }

        // For updates (PATCH), use partial schema to allow optional fields
        // For creates (POST), use full schema with required fields
        const schemaToUse = isUpdate ? schema.partial() : schema;

        // For updates, we still need to validate that if fields are present, they're valid
        // But we don't require all fields to be present
        const validated = schemaToUse.parse(preprocessedData);
        return { success: true, data: validated };
    } catch (error) {
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
 * 
 * Validates email and password for login attempts.
 * Ensures email is in valid format and password is provided.
 * 
 * @param {Object} data - Login data with email and password
 * @param {string} data.email - User email address
 * @param {string} data.password - User password
 * @returns {Object} - { success: boolean, data?: Object, error?: string, details?: Array }
 */
function validateLogin(data) {
    try {
        const validated = loginSchema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
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

module.exports = {
    validateRequest,
    validateLogin,
    VALIDATION_SCHEMAS
};

