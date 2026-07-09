// backend/config/constants.ts

import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';

// --- Environment & Port Configuration ---
// Use BACKEND_PORT (not the generic PORT) so the Vite dev server and preview
// tools can set PORT for the frontend without conflicting with Express.
export const PORT = parseInt(process.env.BACKEND_PORT || '8090', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const MANAGEMENT_API_URL = process.env.MANAGEMENT_API_URL || 'http://localhost:8092';
export const isElectron = (process.versions && !!process.versions.electron) || (typeof process !== 'undefined' && process.env && !!process.env.ELECTRON_RUN_AS_NODE);

// --- Directory Configuration ---
export const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV !== 'test' && process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : path.join(process.cwd(), 'pb_data'));
// Note: __dirname in compiled TS might differ if structure changes, but for now assuming output structure mirrors input or using logical paths
export const DB_FILE = path.join(DATA_DIR, 'master.db');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const IMPORT_DIR = path.join(DATA_DIR, 'processing'); // Isolated temp storage to prevent clutter
export const BACKUP_DIR = path.join(DATA_DIR, 'backup');
export const LOGS_DIR = path.join(DATA_DIR, 'logs');
export const AUDIT_LOGS_DIR = path.join(DATA_DIR, 'audit_logs');

// --- Security Configuration ---

/**
 * Retrieve a named secret from env, or generate + persist it to DATA_DIR/secrets.json.
 * Persisted secrets survive restarts (important for Electron packaged apps where
 * environment variables cannot be set in the traditional sense).
 * In non-Electron production builds, the env var is required.
 */
function getOrCreateSecret(name: string, envValue: string | undefined): string {
    if (envValue) return envValue;

    // Auto-generate and persist secret to disk so sessions survive restarts
    const secretsFile = path.join(DATA_DIR, 'secrets.json');
    let secrets: Record<string, string> = {};

    if (fs.existsSync(secretsFile)) {
        try {
            secrets = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
        } catch {
            console.warn(`[Security] Could not parse ${secretsFile}; regenerating secrets`);
        }
    }

    if (!secrets[name]) {
        secrets[name] = crypto.randomBytes(64).toString('hex');
        try {
            fs.mkdirSync(path.dirname(secretsFile), { recursive: true });
            fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2), { mode: 0o600 });
            if (isElectron) {
                console.log(`[Security] Generated persistent ${name} → ${secretsFile}`);
            } else {
                console.warn(`[Security] Using temporary ${name}. Set it in .env for stability.`);
            }
        } catch (e) {
            console.warn(`[Security] Could not persist ${name} to disk:`, e);
        }
    }

    return secrets[name];
}

export const JWT_SECRET     = getOrCreateSecret('JWT_SECRET',     process.env.JWT_SECRET);
export const SESSION_SECRET = getOrCreateSecret('SESSION_SECRET', process.env.SESSION_SECRET);

// --- TLS Configuration ---
export const TLS_ENABLED = process.env.TLS_ENABLED === 'true';
export const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
export const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
export const FORCE_HTTPS = process.env.FORCE_HTTPS === 'true';
export const PROTOCOL = TLS_ENABLED ? 'https' : 'http';

// --- CORS Configuration ---
export const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:8090',
        'http://localhost:8091',
        'http://localhost:8092',
        'http://localhost:5177',
        'http://127.0.0.1:5177',
        'http://127.0.0.1:8092',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:4173',
        'http://127.0.0.1:8090',
        'http://127.0.0.1:8091',
        // Dynamically add local network IPs
        ...Object.values(os.networkInterfaces()).flat()
            .filter((net): net is os.NetworkInterfaceInfo => !!net && net.family === 'IPv4' && !net.internal)
            .map(net => `http://${net.address}:8092`),
        ...Object.values(os.networkInterfaces()).flat()
            .filter((net): net is os.NetworkInterfaceInfo => !!net && net.family === 'IPv4' && !net.internal)
            .map(net => `http://${net.address}:8091`)
    ];

// --- Web Root Configuration ---
// --- Web Root Configuration ---
const IS_PROD_CHECK = path.basename(path.dirname(path.dirname(__dirname))) === 'resources';
export const IS_PROD = IS_PROD_CHECK;

const resolveWebRoot = () => {
    // 0. Explicit WEB_ROOT passed from Electron main process
    if (process.env.WEB_ROOT) {
        console.log(`[WebRoot] Checking explicit env candidate 0: ${process.env.WEB_ROOT}`);
        if (fs.existsSync(path.join(process.env.WEB_ROOT, 'index.html'))) {
            console.log(`[WebRoot] Found candidate 0 (process.env.WEB_ROOT)`);
            return process.env.WEB_ROOT;
        }
    }

    // 1. Production Build (node dist/backend/server.js) -> dist/master
    const candidate1 = path.join(__dirname, '../master');
    console.log(`[WebRoot] Checking candidate 1: ${candidate1}`);
    if (fs.existsSync(path.join(candidate1, 'index.html'))) {
        console.log(`[WebRoot] Found candidate 1`);
        return candidate1;
    }

    // 2. Dev/Common Structure -> dist/master (relative to CWD)
    const candidate2 = path.join(process.cwd(), 'dist/master');
    console.log(`[WebRoot] Checking candidate 2: ${candidate2}`);
    if (fs.existsSync(path.join(candidate2, 'index.html'))) {
        console.log(`[WebRoot] Found candidate 2`);
        return candidate2;
    }

    // 3. Electron Unpacked ASAR Production fallback
    const candidate3 = path.join(process.cwd(), 'resources/app.asar.unpacked/dist/master');
    console.log(`[WebRoot] Checking candidate 3: ${candidate3}`);
    if (fs.existsSync(path.join(candidate3, 'index.html'))) {
        console.log(`[WebRoot] Found candidate 3`);
        return candidate3;
    }

    // 4. ExecPath Relative Unpacked ASAR
    const candidate4 = path.join(path.dirname(process.execPath), 'resources/app.asar.unpacked/dist/master');
    console.log(`[WebRoot] Checking candidate 4: ${candidate4}`);
    if (fs.existsSync(path.join(candidate4, 'index.html'))) {
        console.log(`[WebRoot] Found candidate 4`);
        return candidate4;
    }

    // 5. Fallback for Electron Resources
    if (IS_PROD) {
        console.log(`[WebRoot] Falling back to candidate 1 (Prod): ${candidate1}`);
        return candidate1;
    }

    console.log(`[WebRoot] Using default fallback: ${path.join(process.cwd(), 'dist/master')}`);
    return path.join(process.cwd(), 'dist/master');
};

export const WEB_ROOT = resolveWebRoot();
console.log(`[WebRoot] Resolved WEB_ROOT: ${WEB_ROOT}`);

// --- Rate Limiting Configuration ---
export const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
export const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

// --- Database Table Mapping ---
export const TABLE_MAP = {
    'users': 'users',
    'photographers': 'users',
    'albums': 'albums',
    'photos': 'photos',
    'orders': 'orders',
    'settings': 'settings',
    'kiosks': 'kiosks',
    'destinations': 'destinations',
    'expenses': 'expenses',
    'pairing_requests': 'pairing_requests',
    'packs': 'packs',
    'bookings': 'bookings',
    'kiosk_sessions': 'kiosk_sessions',
    'role_permissions': 'role_permissions',
    'session_types': 'session_types',
    'products': 'products',
    'daily_objectives': 'daily_objectives',
    'assistance_requests': 'assistance_requests'
} as const;

export type TableName = keyof typeof TABLE_MAP;

// --- JSON Column Configuration ---
export const JSON_COLUMNS: Record<string, string[]> = {
    'users': ['permissions', 'workingHours'],
    'albums': ['categories'],
    'photos': ['metadata', 'quality_flags', 'autoEdits'],
    'orders': ['items', 'customer'],
    'settings': [],
    'kiosks': ['lastSync', 'settings'],
    'destinations': [],
    'expenses': [],
    'pairing_requests': [],
    'packs': ['items', 'productsJSON'],
    'bookings': [],
    'kiosk_sessions': [],
    'role_permissions': [],
    'session_types': [],
    'products': [],
    'daily_objectives': [],
    'assistance_requests': []
};

// --- Column Mapping (API field name -> DB column name) ---
export const COLUMN_MAP: Record<string, Record<string, string>> = {
    'users': {
        'id': 'id',
        'name': 'name',
        'email': 'email',
        'password': 'password',
        'role': 'role',
        'avatarUrl': 'avatarUrl',
        'destinationId': 'destinationId',
        'permissions': 'permissions',
        'workingHours': 'workingHours',
        'monthlyTarget': 'monthlyTarget',
        'dailyPhotoTarget': 'dailyPhotoTarget',
        'specialty': 'specialty',
        'payrollType': 'payrollType',
        'monthlySalary': 'monthlySalary',
        'commissionRate': 'commissionRate',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'albums': {
        'id': 'id',
        'title': 'title',
        'date': 'date',
        'photographerId': 'photographerId',
        'roomNumber': 'roomNumber',
        'status': 'status',
        'coverPhotoUrl': 'coverPhotoUrl',
        'source': 'source',
        'categories': 'categories',
        'kiosk_ready': 'kiosk_ready',
        'eventType': 'eventType',
        'customerEmail': 'customerEmail',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'photos': {
        'id': 'id',
        'albumId': 'albumId',
        'url': 'url',
        'title': 'title',
        'photographerId': 'photographerId',
        'roomNumber': 'roomNumber',
        'category': 'category',
        'manualEdits': 'manualEdits',
        'autoEdits': 'autoEdits',
        'autoEnhanced': 'autoEnhanced',
        'metadata': 'metadata',
        'originalFilename': 'originalFilename',
        'fileSize': 'fileSize',
        'thumbnailUrl': 'thumbnailUrl',
        'previewUrl': 'previewUrl',
        'tinyUrl': 'tinyUrl',
        'storagePath': 'storagePath',
        'mimeType': 'mimeType',
        'width': 'width',
        'height': 'height',
        'fileHash': 'fileHash',
        'sync_status': 'sync_status',
        'sync_id': 'sync_id',
        'viewCount': 'viewCount',
        'selectionCount': 'selectionCount',
        'cullingStatus': 'cullingStatus',
        'aiGroupId': 'aiGroupId',
        'watermarked_url': 'watermarked_url',
        'original_file': 'original_file',
        'quality_flags': 'quality_flags',
        'isFavorite': 'isFavorite',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'orders': {
        'id': 'id',
        'date': 'date',
        'orderNumber': 'orderNumber',
        'clientName': 'clientName',
        'email': 'email',
        'customer': 'customer',
        'items': 'items',
        'total': 'total',
        'totalAmount': 'total',
        'status': 'status',
        'paymentMethod': 'paymentMethod',
        'kioskId': 'kioskId',
        'photographerId': 'photographerId',
        'destinationId': 'destinationId',
        'appliedDiscount': 'appliedDiscount',
        'phone': 'phone',
        'source': 'source',
        'albumId': 'albumId',
        'roomNumber': 'roomNumber',
        'customerEmail': 'customerEmail',
        'paymentIntentId': 'paymentIntentId',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'settings': {
        'id': 'id',
        'key': 'key',
        'value': 'value',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'kiosks': {
        'id': 'id',
        'name': 'name',
        'location': 'location',
        'status': 'status',
        'lastSync': 'lastSync',
        'lastHeartbeat': 'lastHeartbeat',
        'settings': 'settings',
        'uploadFolderPath': 'uploadFolderPath',
        'ordersFolderPath': 'ordersFolderPath',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'destinations': {
        'id': 'id',
        'name': 'name',
        'country': 'country',
        'type': 'type',
        'licenseKey': 'licenseKey',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'expenses': {
        'id': 'id',
        'description': 'description',
        'amount': 'amount',
        'category': 'category',
        'date': 'date',
        'photographerId': 'photographerId',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'pairing_requests': {
        'id': 'id',
        'kioskId': 'kioskId',
        'code': 'code',
        'status': 'status',
        'expiresAt': 'expiresAt',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'packs': {
        'id': 'id',
        'name': 'name',
        'price': 'price',
        'description': 'description',
        'items': 'items',
        'productsJSON': 'productsJSON',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'bookings': {
        'id': 'id',
        'clientName': 'clientName',
        'clientEmail': 'clientEmail',
        'clientPhone': 'clientPhone',
        'bookingDate': 'bookingDate',
        'bookingTime': 'bookingTime',
        'sessionId': 'sessionId',
        'photographerId': 'photographerId',
        'status': 'status',
        'destinationId': 'destinationId',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'kiosk_sessions': {
        'id': 'id',
        'kioskId': 'kioskId',
        'startTime': 'startTime',
        'endTime': 'endTime',
        'status': 'status',
        'last_seen': 'last_seen',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'role_permissions': {
        'role': 'role',
        'permission': 'permission',
        'created': 'created_at'
    },
    'session_types': {
        'id': 'id',
        'name': 'name',
        'numberOfPhotos': 'numberOfPhotos',
        'description': 'description',
        'duration': 'duration',
        'price': 'price',
        'currency': 'currency',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'products': {
        'id': 'id',
        'name': 'name',
        'description': 'description',
        'price': 'price',
        'category': 'category',
        'type': 'type',
        'imageUrl': 'imageUrl',
        'stock': 'stock',
        'isFeatured': 'isFeatured',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'daily_objectives': {
        'id': 'id',
        'photographerId': 'photographer_id',
        'date': 'date',
        'target': 'target',
        'status': 'status',
        'created': 'created_at',
        'updated': 'updated_at'
    },
    'assistance_requests': {
        'id': 'id',
        'kioskId': 'kioskId',
        'message': 'message',
        'status': 'status',
        'resolvedAt': 'resolvedAt',
        'resolvedBy': 'resolvedBy',
        'created': 'createdAt',
        'updated': 'createdAt'
    }
};

// --- Allowed Columns for Each Table ---
export const ALLOWED_COLUMNS: Record<string, string[]> = {};
Object.keys(COLUMN_MAP).forEach(table => {
    ALLOWED_COLUMNS[table] = Object.values(COLUMN_MAP[table]);
});
