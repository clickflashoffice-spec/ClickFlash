#pragma once

#include <string>
#include <memory>
#include <mutex>
#include <vector>
#include <optional>
#include <functional>

struct sqlite3;

namespace ClickFlash {

class DatabaseManager {
public:
    explicit DatabaseManager(const std::string& dbPath);
    ~DatabaseManager();

    void initialize();
    void close();

    bool execute(const std::string& sql);
    bool execute(const std::string& sql, const std::vector<std::string>& params);

    std::optional<std::string> querySingle(const std::string& sql);
    std::vector<std::vector<std::string>> queryMultiple(const std::string& sql);

    bool beginTransaction();
    bool commitTransaction();
    bool rollbackTransaction();

    bool createTable(const std::string& name, const std::string& schema);
    bool tableExists(const std::string& name);

    int64_t getLastInsertRowId() const;
    int getChanges() const;

    void runMigrations();

private:
    void open();
    void createDefaultTables();

    std::string dbPath_;
    sqlite3* db_;
    std::mutex mutex_;
    bool isOpen_;
};

}