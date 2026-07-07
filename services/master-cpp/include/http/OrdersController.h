#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class OrdersController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/orders", handleList);
        router.post("/api/orders", handleCreate);
        router.get("/api/orders/:id", handleGet);
        router.patch("/api/orders/:id/status", handleUpdateStatus);
        router.post("/api/orders/:id/print", handlePrint);
    }
    
    static void handleList(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        QString status = req.query.contains("status") ? req.query.mid(7) : "";
        
        QString query = "SELECT * FROM orders";
        QVariantMap params;
        
        if (!status.isEmpty()) {
            query += " WHERE status = :status";
            params["status"] = status;
        }
        
        query += " ORDER BY created_at DESC";
        
        auto orders = db.executeQueryMultiple(query, params);
        
        res.setJson(QVariantMap({
            {"data", orders},
            {"count", orders.size()}
        }));
    }
    
    static void handleCreate(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        QString id = QString("ORD-%1").arg(QDateTime::currentSecsSinceEpoch());
        
        QString customerName = req.body.value("customerName").toString();
        QString customerEmail = req.body.value("customerEmail").toString();
        QString albumId = req.body.value("albumId").toString();
        
        if (customerName.isEmpty()) {
            res.setError(400, "Customer name is required");
            return;
        }
        
        bool success = db.execute(
            "INSERT INTO orders (id, album_id, customer_name, customer_email, status, total) "
            "VALUES (:id, :albumId, :customerName, :customerEmail, 'pending', 0)",
            {{"id", id}, {"albumId", albumId}, {"customerName", customerName}, {"customerEmail", customerEmail}}
        );
        
        if (success) {
            res.setStatus(201, "Created");
            res.setJson({{"id", id}, {"success", true}});
        } else {
            res.setError(500, "Failed to create order");
        }
    }
    
    static void handleGet(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto order = db.executeQuery(
            "SELECT * FROM orders WHERE id = :id",
            {{"id", id}}
        );
        
        if (order.isEmpty()) {
            res.setError(404, "Order not found");
            return;
        }
        
        res.setJson(order);
    }
    
    static void handleUpdateStatus(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        QString newStatus = req.body.value("status").toString();
        
        static QStringList validStatuses = {
            "pending", "approved", "processing", "printing", "shipped", "delivered", "cancelled"
        };
        
        if (!validStatuses.contains(newStatus)) {
            res.setError(400, "Invalid status");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "UPDATE orders SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
            {{"status", newStatus}, {"id", id}}
        );
        
        res.setJson({{"success", true}, {"status", newStatus}});
    }
    
    static void handlePrint(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto order = db.executeQuery(
            "SELECT * FROM orders WHERE id = :id",
            {{"id", id}}
        );
        
        if (order.isEmpty()) {
            res.setError(404, "Order not found");
            return;
        }
        
        res.setJson({{"success", true}, {"message", "Print job queued"}, {"orderId", id}});
    }
};

} // namespace ClickFlash
