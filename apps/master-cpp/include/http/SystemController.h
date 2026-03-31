#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class SystemController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/system", handleSystemInfo);
        router.get("/api/system/health", handleHealth);
        router.get("/api/system/stats", handleStats);
    }
    
    static void handleSystemInfo(const HttpRequest& req, HttpResponse& res) {
        QVariantMap info;
        info["app"] = "ClickFlash Master";
        info["version"] = "1.0.0";
        info["platform"] = "Windows";
        info["database"] = "SQLite";
        
        QVariantMap db;
        DatabaseManager& dbManager = DatabaseManager::instance();
        
        auto userCount = dbManager.executeQuery("SELECT COUNT(*) as count FROM users");
        auto albumCount = dbManager.executeQuery("SELECT COUNT(*) as count FROM albums");
        auto photoCount = dbManager.executeQuery("SELECT COUNT(*) as count FROM photos");
        auto orderCount = dbManager.executeQuery("SELECT COUNT(*) as count FROM orders");
        
        db["users"] = userCount.value("count");
        db["albums"] = albumCount.value("count");
        db["photos"] = photoCount.value("count");
        db["orders"] = orderCount.value("count");
        
        info["database"] = db;
        
        res.setJson(info);
    }
    
    static void handleHealth(const HttpRequest& req, HttpResponse& res) {
        QVariantMap health;
        
        DatabaseManager& db = DatabaseManager::instance();
        bool dbOk = db.db().isOpen();
        
        health["status"] = dbOk ? "healthy" : "unhealthy";
        health["database"] = dbOk ? "connected" : "disconnected";
        health["timestamp"] = QDateTime::currentSecsSinceEpoch();
        
        res.setJson(health);
    }
    
    static void handleStats(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        QVariantMap stats;
        
        auto todayOrders = db.executeQuery(
            "SELECT COUNT(*) as count, SUM(total) as revenue FROM orders WHERE DATE(created_at) = DATE('now')"
        );
        
        auto weekOrders = db.executeQuery(
            "SELECT COUNT(*) as count, SUM(total) as revenue FROM orders WHERE created_at >= DATE('now', '-7 days')"
        );
        
        auto pendingOrders = db.executeQuery(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
        );
        
        stats["today"] = QVariantMap({
            {"orders", todayOrders.value("count")},
            {"revenue", todayOrders.value("revenue")}
        });
        
        stats["week"] = QVariantMap({
            {"orders", weekOrders.value("count")},
            {"revenue", weekOrders.value("revenue")}
        });
        
        stats["pending"] = pendingOrders.value("count");
        
        res.setJson(stats);
    }
};

} // namespace ClickFlash
