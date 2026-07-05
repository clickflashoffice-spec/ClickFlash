#include "db/DatabaseManager.h"
#include <fstream>
#include <sstream>
#include <filesystem>
#include <iomanip>

namespace cf::db {

DatabaseManager& DatabaseManager::instance() {
    static DatabaseManager inst;
    return inst;
}

drogon::Task<void> DatabaseManager::initialize(const std::string& dbPath, const std::string& rawKey) {
    std::lock_guard<std::mutex> lock(mtx_);
    
    if (initialized_) {
        spdlog::warn("DatabaseManager already initialized");
        co_return;
    }
    
    try {
        // Open database
        db_ = std::make_unique<SQLite::Database>(
            dbPath, 
            SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE
        );
        
        // Apply SQLCipher key (must be first statement)
        if (!rawKey.empty()) {
            std::string keySql = "PRAGMA key = \"x'" + rawKey + "'\"";
            db_->exec(keySql);
            spdlog::info("SQLCipher key applied");
        }
        
        // Verify key by running a test query
        try {
            db_->exec("SELECT count(*) FROM sqlite_master");
        } catch (const SQLite::Exception& e) {
            throw std::runtime_error("Wrong SQLCipher key: " + std::string(e.what()));
        }
        
        // Performance settings
        db_->exec("PRAGMA journal_mode = WAL");
        db_->exec("PRAGMA synchronous = NORMAL");
        db_->exec("PRAGMA busy_timeout = 5000");
        db_->exec("PRAGMA foreign_keys = ON");
        db_->exec("PRAGMA temp_store = memory");
        db_->exec("PRAGMA mmap_size = 268435456"); // 256MB
        
        initialized_ = true;
        spdlog::info("DatabaseManager initialized: {}", dbPath);
        
    } catch (const std::exception& e) {
        spdlog::error("Failed to initialize database: {}", e.what());
        throw;
    }
    
    co_return;
}

SQLite::Database& DatabaseManager::conn() {
    if (!db_) {
        throw std::runtime_error("Database not initialized");
    }
    return *db_;
}

drogon::Task<void> DatabaseManager::runMigrations(const std::string& migrationsDir) {
    if (!initialized_) {
        throw std::runtime_error("Database not initialized");
    }
    
    MigrationRunner runner(*db_);
    co_await runner.applyAll(migrationsDir);
    
    co_return;
}

// MigrationRunner implementation

drogon::Task<void> MigrationRunner::applyAll(const std::string& dir) {
    // Create migrations table if not exists
    db_.exec(R"(
        CREATE TABLE IF NOT EXISTS __migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    )");
    
    if (!std::filesystem::exists(dir)) {
        spdlog::warn("Migrations directory not found: {}", dir);
        co_return;
    }
    
    std::vector<std::filesystem::path> files;
    for (const auto& entry : std::filesystem::directory_iterator(dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".sql") {
            files.push_back(entry.path());
        }
    }
    
    // Sort by filename
    std::sort(files.begin(), files.end());
    
    for (const auto& file : files) {
        std::string filename = file.filename().string();
        
        bool alreadyApplied = co_await isApplied(filename);
        if (alreadyApplied) {
            spdlog::debug("Migration already applied: {}", filename);
            continue;
        }
        
        co_await applyFile(file.string());
        
        // Record migration
        SQLite::Statement stmt(db_, "INSERT INTO __migrations (filename) VALUES (?)");
        stmt.bind(1, filename);
        stmt.exec();
        
        spdlog::info("Applied migration: {}", filename);
    }
    
    co_return;
}

drogon::Task<void> MigrationRunner::applyFile(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open migration file: " + path);
    }
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string sql = buffer.str();
    
    if (sql.empty()) {
        spdlog::warn("Empty migration file: {}", path);
        co_return;
    }
    
    try {
        db_.exec(sql);
    } catch (const SQLite::Exception& e) {
        spdlog::error("Migration failed {}: {}", path, e.what());
        throw;
    }
    
    co_return;
}

drogon::Task<bool> MigrationRunner::isApplied(const std::string& filename) {
    try {
        SQLite::Statement stmt(db_, "SELECT 1 FROM __migrations WHERE filename = ?");
        stmt.bind(1, filename);
        return stmt.executeStep();
    } catch (...) {
        co_return false;
    }
}

} // namespace cf::db
