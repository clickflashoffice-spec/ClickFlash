#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class AnalyticsController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/analytics/summary", handleSummary);
        router.get("/api/analytics/revenue", handleRevenue);
        router.get("/api/analytics/photographers", handlePhotographerStats);
        router.get("/api/analytics/products", handleProductStats);
        router.get("/api/analytics/trends", handleTrends);
    }
    
    static void handleSummary(const HttpRequest& req, HttpResponse& res) {
        int days = req.query.value("days", "30").toInt();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto stats = db.executeQuery(
            QString("SELECT COALESCE(SUM(total), 0) as totalRevenue, COUNT(*) as totalOrders "
                    "FROM orders WHERE status != 'cancelled' AND created_at >= date('now', '-%1 days')").arg(days)
        );
        
        auto todayOrders = db.executeQuery(
            "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE('now')"
        );
        
        auto todayRevenue = db.executeQuery(
            "SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE DATE(created_at) = DATE('now') AND status != 'cancelled'"
        );
        
        auto pendingOrders = db.executeQuery(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
        );
        
        res.setJson(QVariantMap({
            {"totalRevenue", stats.value("totalRevenue").toDouble()},
            {"totalOrders", stats.value("totalOrders").toInt()},
            {"todayOrders", todayOrders.value("count").toInt()},
            {"todayRevenue", todayRevenue.value("revenue").toDouble()},
            {"pendingOrders", pendingOrders.value("count").toInt()},
            {"periodDays", days}
        }));
    }
    
    static void handleRevenue(const HttpRequest& req, HttpResponse& res) {
        int days = req.query.value("days", "30").toInt();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            QString("SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders "
                    "FROM orders WHERE status != 'cancelled' AND created_at >= date('now', '-%1 days') "
                    "GROUP BY DATE(created_at) ORDER BY date ASC").arg(days)
        );
        
        QVariantList revenueData;
        for (const QVariantMap& row : results) {
            revenueData.append(QVariantMap({
                {"date", row.value("date")},
                {"revenue", row.value("revenue").toDouble()},
                {"orders", row.value("orders").toInt()}
            }));
        }
        
        res.setJson(QVariantMap({
            {"data", revenueData},
            {"count", revenueData.size()}
        }));
    }
    
    static void handlePhotographerStats(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            "SELECT u.id, u.name, COUNT(DISTINCT a.id) as albums, COUNT(p.id) as photos, "
            "COALESCE(SUM(o.total), 0) as revenue "
            "FROM users u "
            "LEFT JOIN albums a ON a.photographer_id = u.id "
            "LEFT JOIN photos p ON p.photographer_id = u.id "
            "LEFT JOIN orders o ON o.photographer_id = u.id AND o.status != 'cancelled' "
            "WHERE u.role IN ('Photographer', 'Team Leader', 'Manager') "
            "GROUP BY u.id ORDER BY revenue DESC"
        );
        
        QVariantList photographers;
        for (const QVariantMap& row : results) {
            photographers.append(QVariantMap({
                {"id", row.value("id").toInt()},
                {"name", row.value("name")},
                {"albums", row.value("albums").toInt()},
                {"photos", row.value("photos").toInt()},
                {"revenue", row.value("revenue").toDouble()}
            }));
        }
        
        res.setJson(QVariantMap({
            {"photographers", photographers},
            {"count", photographers.size()}
        }));
    }
    
    static void handleProductStats(const HttpRequest& req, HttpResponse& res) {
        int days = req.query.value("days", "30").toInt();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            QString("SELECT p.name, p.category, p.price, COUNT(oi.id) as sales, "
                    "SUM(oi.quantity * oi.price) as revenue "
                    "FROM products p "
                    "LEFT JOIN order_items oi ON oi.product_id = p.id "
                    "LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled' "
                    "WHERE o.created_at >= date('now', '-%1 days') OR o.id IS NULL "
                    "GROUP BY p.id ORDER BY revenue DESC").arg(days)
        );
        
        QVariantList products;
        for (const QVariantMap& row : results) {
            products.append(QVariantMap({
                {"name", row.value("name")},
                {"category", row.value("category")},
                {"price", row.value("price").toDouble()},
                {"sales", row.value("sales").toInt()},
                {"revenue", row.value("revenue").toDouble()}
            }));
        }
        
        res.setJson(QVariantMap({
            {"products", products},
            {"count", products.size()}
        }));
    }
    
    static void handleTrends(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto monthly = db.executeQueryMultiple(
            "SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, "
            "COALESCE(SUM(total), 0) as revenue "
            "FROM orders WHERE status != 'cancelled' AND created_at >= date('now', '-12 months') "
            "GROUP BY month ORDER BY month ASC"
        );
        
        auto weekly = db.executeQueryMultiple(
            "SELECT strftime('%Y-%W', created_at) as week, COUNT(*) as orders "
            "FROM orders WHERE status != 'cancelled' AND created_at >= date('now', '-4 weeks') "
            "GROUP BY week ORDER BY week ASC"
        );
        
        res.setJson(QVariantMap({
            {"monthly", QVariant::fromValue(monthly)},
            {"weekly", QVariant::fromValue(weekly)}
        }));
    }
};

} // namespace ClickFlash