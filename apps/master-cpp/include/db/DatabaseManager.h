#pragma once
#include <sqlite3.h>
#include <SQLiteCpp/SQLiteCpp.h>
#include <drogon/drogon.h>
#include <string>
#include <memory>
#include <mutex>
#include <spdlog/spdlog.h>

namespace cf::db {

class DatabaseManager {
public:
    static DatabaseManager& instance();
    
    // Initialize with database path and SQLCipher key
    drogon::Task<void> initialize(const std::string& dbPath, const std::string& rawKey);
    
    // Get database connection (throws if not initialized)
    SQLite::Database& conn();
    
    // Run all migrations from directory
    drogon::Task<void> runMigrations(const std::string& migrationsDir);
    
    // Check if initialized
    bool isInitialized() const { return db_ != nullptr; }
    
private:
    DatabaseManager() = default;
    ~DatabaseManager() = default;
    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;
    
    std::unique_ptr<SQLite::Database> db_;
    std::mutex mtx_;
    bool initialized_ = false;
};

class MigrationRunner {
public:
    explicit MigrationRunner(SQLite::Database& db) : db_(db) {}
    
    drogon::Task<void> applyAll(const std::string& dir);
    
private:
    drogon::Task<void> applyFile(const std::string& path);
    drogon::Task<bool> isApplied(const std::string& filename);
    
    SQLite::Database& db_;
};

} // namespace cf::db
