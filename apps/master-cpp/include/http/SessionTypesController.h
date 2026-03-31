#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class SessionTypesController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/session-types", handleGetAll);
        router.post("/api/session-types", handleCreate);
        router.get("/api/session-types/:id", handleGet);
        router.put("/api/session-types/:id", handleUpdate);
        router.delete("/api/session-types/:id", handleDelete);
    }
    
    static void handleGetAll(const HttpRequest& req, HttpResponse& res) {
        Q_UNUSED(req);
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            "SELECT id, name, duration, price, description, created_at FROM session_types ORDER BY name ASC"
        );
        
        QVariantList types;
        for (const QVariantMap& row : results) {
            types.append(QVariantMap({
                {"id", row.value("id")},
                {"name", row.value("name")},
                {"duration", row.value("duration").toInt()},
                {"price", row.value("price").toDouble()},
                {"description", row.value("description")},
                {"createdAt", row.value("created_at")}
            }));
        }
        
        res.setJson(QVariantMap({
            {"sessionTypes", types},
            {"count", types.size()}
        }));
    }
    
    static void handleCreate(const HttpRequest& req, HttpResponse& res) {
        QString name = req.body.value("name").toString();
        int duration = req.body.value("duration", 60).toInt();
        double price = req.body.value("price", 0).toDouble();
        QString description = req.body.value("description").toString();
        
        if (name.isEmpty()) {
            res.setError(400, "Name is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
        
        db.execute(
            "INSERT INTO session_types (id, name, duration, price, description, created_at) "
            "VALUES (:id, :name, :duration, :price, :description, CURRENT_TIMESTAMP)",
            {
                {"id", id},
                {"name", name},
                {"duration", duration},
                {"price", QString::number(price, 'f', 2)},
                {"description", description}
            }
        );
        
        res.setStatus(201);
        res.setJson(QVariantMap({
            {"success", true},
            {"id", id},
            {"name", name},
            {"duration", duration},
            {"price", price}
        }));
    }
    
    static void handleGet(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        if (id.isEmpty()) {
            res.setError(400, "Session type ID is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto result = db.executeQuery(
            "SELECT * FROM session_types WHERE id = :id",
            {{"id", id}}
        );
        
        if (result.isEmpty()) {
            res.setError(404, "Session type not found");
            return;
        }
        
        res.setJson(QVariantMap({
            {"id", result.value("id")},
            {"name", result.value("name")},
            {"duration", result.value("duration").toInt()},
            {"price", result.value("price").toDouble()},
            {"description", result.value("description")}
        }));
    }
    
    static void handleUpdate(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        if (id.isEmpty()) {
            res.setError(400, "Session type ID is required");
            return;
        }
        
        QString name = req.body.value("name").toString();
        int duration = req.body.value("duration").toInt();
        double price = req.body.value("price").toDouble();
        QString description = req.body.value("description").toString();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "UPDATE session_types SET name = :name, duration = :duration, price = :price, "
            "description = :description WHERE id = :id",
            {
                {"name", name},
                {"duration", duration},
                {"price", QString::number(price, 'f', 2)},
                {"description", description},
                {"id", id}
            }
        );
        
        res.setJson(QVariantMap({
            {"success", true},
            {"message", "Session type updated"}
        }));
    }
    
    static void handleDelete(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        if (id.isEmpty()) {
            res.setError(400, "Session type ID is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute("DELETE FROM session_types WHERE id = :id", {{"id", id}});
        
        res.setJson(QVariantMap({
            {"success", true},
            {"message", "Session type deleted"}
        }));
    }
};

} // namespace ClickFlash