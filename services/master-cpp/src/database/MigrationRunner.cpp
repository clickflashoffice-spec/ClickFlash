#include "database/MigrationRunner.h"
#include "core/Logger.h"
#include <QSqlQuery>
#include <QSqlError>

namespace ClickFlash {

MigrationRunner::MigrationRunner(QSqlDatabase& db)
    : m_db(db), m_currentVersion("0") {}

MigrationRunner::~MigrationRunner() {}

std::vector<Migration> MigrationRunner::getMigrations() {
    return {
        {
            "001_initial",
            "Initial schema",
            R"(
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT,
                    role TEXT NOT NULL DEFAULT 'Photographer',
                    specialty TEXT,
                    avatarUrl TEXT,
                    monthlyTarget INTEGER DEFAULT 0,
                    dailyPhotoTarget INTEGER DEFAULT 0,
                    payrollType TEXT DEFAULT 'Salary',
                    monthlySalary REAL,
                    commissionRate REAL,
                    destinationId TEXT,
                    workingHours TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS albums (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    date TEXT NOT NULL,
                    photographerId INTEGER,
                    coverPhotoUrl TEXT,
                    source TEXT,
                    roomNumber TEXT,
                    status TEXT DEFAULT 'Draft',
                    categories TEXT,
                    pricePerPhoto REAL DEFAULT 0,
                    fullGalleryPrice REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(photographerId) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS photos (
                    id TEXT PRIMARY KEY,
                    albumId TEXT NOT NULL,
                    title TEXT,
                    url TEXT NOT NULL,
                    thumbnailUrl TEXT,
                    photographerId INTEGER,
                    category TEXT,
                    roomNumber TEXT,
                    manualEdits TEXT,
                    cullingStatus TEXT DEFAULT 'Unprocessed',
                    aiGroupId TEXT,
                    isFavorite INTEGER DEFAULT 0,
                    qualityFlags TEXT,
                    adjustmentsStack TEXT,
                    presets TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(albumId) REFERENCES albums(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS orders (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    orderNumber TEXT,
                    clientName TEXT,
                    email TEXT,
                    status TEXT DEFAULT 'Pending',
                    total REAL DEFAULT 0,
                    photographerId INTEGER,
                    destinationId TEXT,
                    paymentMethod TEXT,
                    appliedDiscount REAL DEFAULT 0,
                    items TEXT,
                    orderSource TEXT,
                    syncStatus TEXT,
                    syncVector TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS products (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT,
                    price REAL NOT NULL,
                    stock INTEGER DEFAULT 0,
                    isFeatured INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS packs (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    price REAL NOT NULL,
                    productsJSON TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS bookings (
                    id TEXT PRIMARY KEY,
                    clientName TEXT NOT NULL,
                    clientEmail TEXT,
                    clientPhone TEXT,
                    bookingDate TEXT NOT NULL,
                    bookingTime TEXT,
                    sessionId TEXT,
                    photographerId INTEGER,
                    status TEXT DEFAULT 'Pending',
                    destinationId TEXT,
                    sessionTiming TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(photographerId) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS kiosks (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT DEFAULT 'Disconnected',
                    pairingToken TEXT,
                    signingSecret TEXT,
                    lastSeen DATETIME,
                    settings TEXT,
                    folderPaths TEXT,
                    rfid TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );

                CREATE TABLE IF NOT EXISTS destinations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    country TEXT NOT NULL,
                    type TEXT NOT NULL,
                    licenseKey TEXT,
                    featuresJSON TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS ai_groups (
                    id TEXT PRIMARY KEY,
                    albumId TEXT NOT NULL,
                    bestPhotoId TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(albumId) REFERENCES albums(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ai_scores (
                    photoId TEXT PRIMARY KEY,
                    overallScore REAL,
                    sharpnessScore REAL,
                    exposureScore REAL,
                    compositionScore REAL,
                    expressionScore REAL,
                    technicalScore REAL,
                    embedding BLOB,
                    analysisVersion TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(photoId) REFERENCES photos(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS photo_faces (
                    id TEXT PRIMARY KEY,
                    photoId TEXT NOT NULL,
                    descriptor TEXT NOT NULL,
                    box TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(photoId) REFERENCES photos(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS face_indexing_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    photoId TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    priority INTEGER DEFAULT 0,
                    attempts INTEGER DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS processing_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    payload TEXT,
                    status TEXT DEFAULT 'pending',
                    priority INTEGER DEFAULT 0,
                    progress INTEGER DEFAULT 0,
                    attempts INTEGER DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS fulfillment_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    orderId TEXT NOT NULL,
                    type TEXT DEFAULT 'ASSET',
                    status TEXT DEFAULT 'pending',
                    priority INTEGER DEFAULT 1,
                    progress INTEGER DEFAULT 0,
                    attempts INTEGER DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(orderId) REFERENCES orders(id)
                );

                CREATE TABLE IF NOT EXISTS gallery_tokens (
                    id TEXT PRIMARY KEY,
                    orderId TEXT NOT NULL,
                    token TEXT NOT NULL,
                    expiresAt DATETIME,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(orderId) REFERENCES orders(id)
                );

                CREATE TABLE IF NOT EXISTS gallery_orders (
                    id TEXT PRIMARY KEY,
                    galleryTokenId TEXT NOT NULL,
                    customerName TEXT,
                    customerEmail TEXT,
                    total REAL,
                    status TEXT DEFAULT 'pending',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(galleryTokenId) REFERENCES gallery_tokens(id)
                );

                CREATE TABLE IF NOT EXISTS login_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ipAddress TEXT,
                    success INTEGER DEFAULT 1,
                    FOREIGN KEY(userId) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS operation_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entityType TEXT NOT NULL,
                    entityId TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    userId INTEGER,
                    oldValue TEXT,
                    newValue TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS session_types (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    duration INTEGER,
                    price REAL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS marketing_campaigns (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT DEFAULT 'draft',
                    schedule TEXT,
                    targetAudience TEXT,
                    content TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS photographer_ledger (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    photographerId INTEGER NOT NULL,
                    period TEXT NOT NULL,
                    salary REAL DEFAULT 0,
                    commission REAL DEFAULT 0,
                    bonus REAL DEFAULT 0,
                    deductions REAL DEFAULT 0,
                    total REAL DEFAULT 0,
                    paid INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(photographerId) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS inventory (
                    id TEXT PRIMARY KEY,
                    productName TEXT NOT NULL,
                    sku TEXT,
                    quantity INTEGER DEFAULT 0,
                    category TEXT,
                    lastSynced DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS daily_objectives (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    photoTarget INTEGER,
                    revenueTarget REAL,
                    completedPhotos INTEGER DEFAULT 0,
                    completedRevenue REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(userId) REFERENCES users(id)
                );
            )",
            false
        },
        {
            "002_indexes",
            "Performance indexes",
            R"(
                CREATE INDEX IF NOT EXISTS idx_albums_photographer ON albums(photographerId);
                CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
                CREATE INDEX IF NOT EXISTS idx_photos_albumId ON photos(albumId);
                CREATE INDEX IF NOT EXISTS idx_photos_photographerId ON photos(photographerId);
                CREATE INDEX IF NOT EXISTS idx_photos_cullingStatus ON photos(cullingStatus);
                CREATE INDEX IF NOT EXISTS idx_photos_aiGroupId ON photos(aiGroupId);
                CREATE INDEX IF NOT EXISTS idx_orders_photographerId ON orders(photographerId);
                CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
                CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
                CREATE INDEX IF NOT EXISTS idx_bookings_photographerId ON bookings(photographerId);
                CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(bookingDate);
                CREATE INDEX IF NOT EXISTS idx_photo_faces_photoId ON photo_faces(photoId);
                CREATE INDEX IF NOT EXISTS idx_ai_scores_overall ON ai_scores(overallScore);
                CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status, priority);
                CREATE INDEX IF NOT EXISTS idx_face_queue_status ON face_indexing_queue(status, priority);
                CREATE INDEX IF NOT EXISTS idx_fulfillment_status_type ON fulfillment_queue(status, type);
                CREATE INDEX IF NOT EXISTS idx_fulfillment_order ON fulfillment_queue(orderId);
            )",
            false
        }
    };
}

bool MigrationRunner::runMigrations() {
    CF_INFO("Running database migrations...");
    
    m_db.exec(R"(
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    )");
    
    QSqlQuery query(m_db);
    query.exec("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1");
    
    if (query.next()) {
        m_currentVersion = query.value(0).toString();
    }
    
    auto migrations = getMigrations();
    
    for (const auto& migration : migrations) {
        if (!isMigrationApplied(migration.version)) {
            if (!applyMigration(migration)) {
                CF_CRITICAL("Failed to apply migration: {}", migration.version.toStdString());
                return false;
            }
            recordMigration(migration.version);
            CF_INFO("Applied migration: {}", migration.version.toStdString());
        }
    }
    
    CF_INFO("Migrations complete. Current version: {}", m_currentVersion.toStdString());
    return true;
}

QString MigrationRunner::getCurrentVersion() const {
    return m_currentVersion;
}

bool MigrationRunner::migrateTo(const QString& version) {
    auto migrations = getMigrations();
    
    for (const auto& migration : migrations) {
        if (migration.version == version && !isMigrationApplied(migration.version)) {
            if (!applyMigration(migration)) {
                return false;
            }
            recordMigration(migration.version);
            m_currentVersion = version;
            return true;
        }
    }
    
    return false;
}

bool MigrationRunner::isMigrationApplied(const QString& version) {
    QSqlQuery query(m_db);
    query.prepare("SELECT 1 FROM schema_migrations WHERE version = :version");
    query.bindValue(":version", version);
    query.exec();
    return query.next();
}

bool MigrationRunner::applyMigration(const Migration& migration) {
    QStringList statements = migration.sql.split(';', Qt::SkipEmptyParts);
    
    m_db.transaction();
    
    for (const QString& stmt : statements) {
        QString trimmed = stmt.trimmed();
        if (trimmed.isEmpty()) continue;
        
        QSqlQuery query(m_db);
        if (!query.exec(trimmed)) {
            CF_ERROR("Migration SQL error: {}", query.lastError().text().toStdString());
            m_db.rollback();
            return false;
        }
    }
    
    m_db.commit();
    return true;
}

void MigrationRunner::recordMigration(const QString& version) {
    QSqlQuery query(m_db);
    query.prepare("INSERT INTO schema_migrations (version) VALUES (:version)");
    query.bindValue(":version", version);
    query.exec();
    m_currentVersion = version;
}

} // namespace ClickFlash
