#pragma once

#include <QObject>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QSqlRecord>
#include <QString>
#include <QVariant>
#include <QVariantMap>
#include <QMutex>
#include <QMutexLocker>
#include <memory>
#include <vector>
#include "core/Logger.h"

namespace ClickFlash {

class DatabaseManager : public QObject {
    Q_OBJECT

public:
    static DatabaseManager& instance() {
        static DatabaseManager instance;
        return instance;
    }

    void initialize() {
        QMutexLocker locker(&m_mutex);
        
        m_db = QSqlDatabase::addDatabase("QSQLITE");
        m_db.setDatabaseName("master.db");
        
        if (!m_db.open()) {
            CF_CRITICAL("Failed to open database: {}", m_db.lastError().text().toStdString());
            throw std::runtime_error("Database initialization failed");
        }
        
        m_db.exec("PRAGMA journal_mode=WAL");
        m_db.exec("PRAGMA foreign_keys=ON");
        m_db.exec("PRAGMA busy_timeout=5000");
        
        CF_INFO("Database initialized successfully");
        
        runMigrations();
    }

    void close() {
        QMutexLocker locker(&m_mutex);
        if (m_db.isOpen()) {
            m_db.close();
            CF_INFO("Database closed");
        }
    }

    QSqlDatabase& db() { return m_db; }

    QVariantMap executeQuery(const QString& query, const QVariantMap& params = {}) {
        QSqlQuery sql(m_db);
        sql.prepare(query);
        
        for (auto it = params.constBegin(); it != params.constEnd(); ++it) {
            sql.bindValue(":" + it.key(), it.value());
        }
        
        if (!sql.exec()) {
            CF_ERROR("Query failed: {} - {}", query.toStdString(), sql.lastError().text().toStdString());
            return {};
        }
        
        QVariantMap result;
        if (sql.next()) {
            QSqlRecord record = sql.record();
            for (int i = 0; i < record.count(); ++i) {
                result[record.fieldName(i)] = record.value(i);
            }
        }
        
        return result;
    }

    std::vector<QVariantMap> executeQueryMultiple(const QString& query, const QVariantMap& params = {}) {
        QSqlQuery sql(m_db);
        sql.prepare(query);
        
        for (auto it = params.constBegin(); it != params.constEnd(); ++it) {
            sql.bindValue(":" + it.key(), it.value());
        }
        
        if (!sql.exec()) {
            CF_ERROR("Query failed: {} - {}", query.toStdString(), sql.lastError().text().toStdString());
            return {};
        }
        
        std::vector<QVariantMap> results;
        while (sql.next()) {
            QSqlRecord record = sql.record();
            QVariantMap row;
            for (int i = 0; i < record.count(); ++i) {
                row[record.fieldName(i)] = record.value(i);
            }
            results.push_back(row);
        }
        
        return results;
    }

    bool execute(const QString& query, const QVariantMap& params = {}) {
        QSqlQuery sql(m_db);
        sql.prepare(query);
        
        for (auto it = params.constBegin(); it != params.constEnd(); ++it) {
            sql.bindValue(":" + it.key(), it.value());
        }
        
        if (!sql.exec()) {
            CF_ERROR("Execution failed: {} - {}", query.toStdString(), sql.lastError().text().toStdString());
            return false;
        }
        
        return true;
    }

    QString lastInsertId() {
        QSqlQuery sql(m_db);
        sql.exec("SELECT last_insert_rowid()");
        if (sql.next()) {
            return sql.value(0).toString();
        }
        return QString();
    }

    void transaction() {
        m_db.transaction();
    }

    void commit() {
        m_db.commit();
    }

    void rollback() {
        m_db.rollback();
    }

Q_SIGNALS:
    void databaseError(const QString& error);

private:
    DatabaseManager(QObject* parent = nullptr) : QObject(parent) {}
    ~DatabaseManager() = default;
    
    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    void runMigrations() {
        CF_INFO("Running database migrations...");
        
        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        )");

        QSqlQuery sql(m_db);
        sql.exec("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1");
        
        QString currentVersion;
        if (sql.next()) {
            currentVersion = sql.value(0).toString();
        }

        if (currentVersion != "001_initial") {
            runInitialMigration();
        }
        
        CF_INFO("Migrations complete. Current version: {}", 
                currentVersion.isEmpty() ? "001_initial" : currentVersion.toStdString());
    }

    void runInitialMigration() {
        transaction();
        
        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'Photographer',
                avatar_url TEXT,
                active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS albums (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                photographer_id INTEGER,
                destination_id TEXT,
                cover_photo_id TEXT,
                photo_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'draft',
                shoot_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (photographer_id) REFERENCES users(id)
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS photos (
                id TEXT PRIMARY KEY,
                album_id TEXT NOT NULL,
                url TEXT NOT NULL,
                title TEXT,
                photographer_id INTEGER,
                category TEXT,
                manual_edits TEXT,
                metadata TEXT,
                thumbnail_url TEXT,
                preview_url TEXT,
                tiny_url TEXT,
                storage_path TEXT,
                file_size INTEGER,
                width INTEGER,
                height INTEGER,
                file_hash TEXT,
                quality_flags TEXT,
                culling_status TEXT DEFAULT 'pending',
                sync_status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (album_id) REFERENCES albums(id),
                FOREIGN KEY (photographer_id) REFERENCES users(id)
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                album_id TEXT,
                customer_name TEXT NOT NULL,
                customer_email TEXT,
                status TEXT DEFAULT 'pending',
                items TEXT,
                subtotal REAL DEFAULT 0,
                tax REAL DEFAULT 0,
                total REAL DEFAULT 0,
                gallery_token TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (album_id) REFERENCES albums(id)
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                photographer_id INTEGER,
                session_type TEXT,
                destination_id TEXT,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                scheduled_at DATETIME,
                duration INTEGER DEFAULT 60,
                status TEXT DEFAULT 'scheduled',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (photographer_id) REFERENCES users(id)
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT DEFAULT 'print',
                price REAL DEFAULT 0,
                sku TEXT UNIQUE,
                active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS kiosks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                pairing_token TEXT,
                pairing_secret TEXT,
                status TEXT DEFAULT 'unpaired',
                last_seen DATETIME,
                paired_at DATETIME
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS destinations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT,
                active INTEGER DEFAULT 1
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                type TEXT DEFAULT 'string',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS login_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS sync_sequences (
                node_id TEXT NOT NULL,
                sequence_number INTEGER NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (node_id, sequence_number)
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS operation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_type TEXT NOT NULL,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                data TEXT,
                synced INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS processing_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_type TEXT NOT NULL,
                photo_id TEXT,
                status TEXT DEFAULT 'pending',
                priority INTEGER DEFAULT 0,
                data TEXT,
                attempts INTEGER DEFAULT 0,
                error TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME
            )
        )");

        m_db.exec(R"(
            CREATE TABLE IF NOT EXISTS photographer_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                photographer_id INTEGER NOT NULL,
                order_id TEXT,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (photographer_id) REFERENCES users(id),
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )
        )");

        m_db.exec("INSERT OR IGNORE INTO schema_migrations (version) VALUES ('001_initial')");
        
        commit();
        
        CF_INFO("Initial migration completed");
    }

    QSqlDatabase m_db;
    QMutex m_mutex;
};

} // namespace ClickFlash
