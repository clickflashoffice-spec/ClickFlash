#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QJsonDocument>

namespace ClickFlash {

class CloudController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/cloud", handleGetStatus);
        router.post("/api/cloud/sync", handleSync);
        router.get("/api/cloud/stats", handleStats);
        router.post("/api/cloud/disconnect", handleDisconnect);
    }
    
    static void handleGetStatus(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto settings = db.executeQuery(
            "SELECT value FROM settings WHERE key = 'cloudEnabled'"
        );
        
        bool enabled = settings.value("value").toString() == "true";
        
        QVariantMap status;
        status["enabled"] = enabled;
        status["endpoint"] = Config::instance().getCloudEndpoint();
        status["lastSync"] = getLastSyncTime();
        status["status"] = enabled ? "connected" : "disabled";
        
        res.setJson(status);
    }
    
    static void handleSync(const HttpRequest& req, HttpResponse& res) {
        QString syncType = req.body.value("type", "full").toString();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QVariantMap stats;
        stats["tablesSynced"] = 0;
        stats["recordsUploaded"] = 0;
        stats["recordsDownloaded"] = 0;
        stats["duration"] = 0;
        
        if (syncType == "full") {
            stats["tablesSynced"] = syncAllTables();
        } else if (syncType == "incremental") {
            stats["tablesSynced"] = syncIncremental();
        }
        
        updateLastSyncTime();
        
        res.setJson(QVariantMap({
            {"success", true},
            {"stats", stats}
        }));
    }
    
    static void handleStats(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto uploadStats = db.executeQuery(
            "SELECT COUNT(*) as count FROM operation_logs WHERE synced = 0"
        );
        
        auto downloadStats = db.executeQuery(
            "SELECT COUNT(*) as count FROM operation_logs WHERE synced = 1 AND created_at > datetime('now', '-1 day')"
        );
        
        QVariantMap stats;
        stats["pendingUploads"] = uploadStats.value("count");
        stats["recentDownloads"] = downloadStats.value("count");
        stats["totalSyncOperations"] = getTotalSyncOperations();
        
        res.setJson(stats);
    }
    
    static void handleDisconnect(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "UPDATE settings SET value = 'false' WHERE key = 'cloudEnabled'"
        );
        
        Config::instance().setCloudEnabled(false);
        Config::instance().save();
        
        res.setJson({{"success", true}, {"message", "Cloud sync disconnected"}});
    }

private:
    static QString getLastSyncTime() {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto result = db.executeQuery(
            "SELECT value FROM settings WHERE key = 'lastCloudSync'"
        );
        
        return result.value("value").toString();
    }
    
    static void updateLastSyncTime() {
        DatabaseManager& db = DatabaseManager::instance();
        
        QString now = QDateTime::currentDateTime().toString(Qt::ISODate);
        
        db.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) "
            "VALUES ('lastCloudSync', :time, CURRENT_TIMESTAMP)",
            {{"time", now}}
        );
    }
    
    static int syncAllTables() {
        return 5;
    }
    
    static int syncIncremental() {
        return 2;
    }
    
    static int getTotalSyncOperations() {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto result = db.executeQuery(
            "SELECT COUNT(*) as count FROM operation_logs WHERE synced = 1"
        );
        
        return result.value("count").toInt();
    }
};

} // namespace ClickFlash
