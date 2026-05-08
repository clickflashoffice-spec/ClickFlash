const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 8093;
const DATA_DIR = process.argv[2] || process.env.DATA_DIR || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const IMPORT_DIR = path.join(DATA_DIR, 'imports');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const AUDIT_LOGS_DIR = path.join(DATA_DIR, 'audit_logs');
const WEB_ROOT = path.join(__dirname, '../dist');

// Helper to map collection names to table names
const TABLE_MAP = {
    'users': 'users',
    'albums': 'albums',
    'photos': 'photos',
    'orders': 'orders',
    'products': 'products',
    'kiosks': 'kiosks',
    'settings': 'settings',
    'destinations': 'destinations',
    'session_types': 'session_types',
    'packs': 'packs',
    'bookings': 'bookings',
    'assets': 'archived_photos',
    'archived_photos': 'archived_photos'
};

// Columns that should be stored as JSON strings
const JSON_COLUMNS = {
    users: ['workingHours'],
    albums: ['categories'],
    photos: ['manualEdits'],
    orders: ['items'],
    kiosks: ['settings'],
    settings: ['value'],
    destinations: ['featuresJSON'],
    packs: ['productsJSON'],
    archived_photos: ['metadata']
};

// Column Aliases for mapping frontend terms to DB columns
const COLUMN_MAP = {
    'created': 'created_at',
    'updated': 'updated_at',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
};

// Whitelist of allowed columns for filtering/sorting
const ALLOWED_COLUMNS = {
    users: ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at'],
    albums: ['id', 'title', 'date', 'status', 'photographerId', 'eventType', 'roomNumber', 'source', 'created_at', 'updated_at'],
    orders: ['id', 'date', 'status', 'clientName', 'albumId', 'totalAmount', 'created_at', 'updated_at'],
    photos: ['id', 'albumId', 'url', 'created_at', 'updated_at'],
    products: ['id', 'name', 'price', 'category', 'status', 'created_at', 'updated_at'],
    kiosks: ['id', 'name', 'status', 'lastHeartbeat', 'created_at', 'updated_at'],
    settings: ['id', 'key', 'value', 'created_at', 'updated_at'],
    session_types: ['id', 'name', 'numberOfPhotos', 'price', 'created_at', 'updated_at'],
    packs: ['id', 'name', 'price', 'description', 'created_at', 'updated_at'],
    bookings: ['id', 'clientName', 'bookingDate', 'status', 'photographerId', 'destinationId', 'created_at', 'updated_at'],
    archived_photos: ['id', 'original_photo_id', 'album_id', 'access_code', 'url', 'thumbnail_url', 'status', 'archived_at', 'expires_at']
};

module.exports = {
    PORT,
    DATA_DIR,
    DB_FILE,
    UPLOAD_DIR,
    IMPORT_DIR,
    BACKUP_DIR,
    LOGS_DIR,
    AUDIT_LOGS_DIR,
    WEB_ROOT,
    TABLE_MAP,
    JSON_COLUMNS,
    COLUMN_MAP,
    ALLOWED_COLUMNS
};
