#pragma once

#include <QString>
#include <QSqlDatabase>
#include <vector>

namespace ClickFlash {

struct Migration {
    QString version;
    QString name;
    QString sql;
    bool applied;
};

class MigrationRunner {
public:
    MigrationRunner(QSqlDatabase& db);
    ~MigrationRunner();

    bool runMigrations();
    QString getCurrentVersion() const;
    bool migrateTo(const QString& version);

private:
    std::vector<Migration> getMigrations();
    bool applyMigration(const Migration& migration);
    bool isMigrationApplied(const QString& version);
    void recordMigration(const QString& version);

    QSqlDatabase& m_db;
    QString m_currentVersion;
};

} // namespace ClickFlash
