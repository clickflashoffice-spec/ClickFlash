const { z } = require('zod');

// Login validation schema
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

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
    destinationId: z.string().optional()
});

// Album validation schema
const albumSchema = z.object({
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
const photoSchema = z.object({
    id: z.string().optional(),
    albumId: z.string().min(1, 'Album ID is required'),
    title: z.string().optional(), // Optional to match database schema
    url: z.string().or(z.any()), // Can be string URL or Blob
    photographerId: z.union([z.number().int().positive(), z.string()]).optional(),
    category: z.string().optional(),
    manualEdits: z.any().optional() // Complex object
});

// Kiosk validation schema
const kioskSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    status: z.enum(['Active', 'Inactive', 'Maintenance', 'Connected', 'Disconnected']).optional(),
    lastHeartbeat: z.string().or(z.date()).optional(), // Accept string ISO or Date object
    settings: z.any().optional()
});

// Product validation schema
const productSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    category: z.string().optional(),
    price: z.number().min(0, 'Price must be non-negative'),
    stock: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional().or(z.number().min(0).max(1)) // Handle boolean or sqlite 0/1
});

// Settings validation schema
const settingSchema = z.object({
    id: z.string().optional(),
    key: z.string().min(1, 'Key is required'),
    value: z.any().optional()
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
 * @param {Object} data - Request body data
 * @param {string} tableName - Table/collection name
 * @returns {Object} - { success: boolean, data?: Object, error?: string }
 */
function validateRequest(data, tableName, isUpdate = false) {
    const schema = VALIDATION_SCHEMAS[tableName];
    
    if (!schema) {
        // No schema defined for this table - allow through (for flexibility)
        return { success: true, data };
    }
    
    try {
        // Preprocess data: convert null to undefined for numeric optional fields
        // This prevents validation errors when null values are sent
        const preprocessedData = { ...data };
        if (tableName === 'users' || tableName === 'photographers') {
            const numericFields = ['monthlySalary', 'commissionRate', 'monthlyTarget', 'dailyPhotoTarget'];
            numericFields.forEach(field => {
                if (preprocessedData[field] === null) {
                    delete preprocessedData[field];
                }
            });
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

