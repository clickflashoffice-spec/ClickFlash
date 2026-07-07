#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include <QJsonDocument>
#include <QJsonObject>

namespace ClickFlash {

class CollectionsController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/collections/:collection/records", handleList);
        router.get("/api/collections/:collection/records/:id", handleGet);
        router.post("/api/collections/:collection/records", handleCreate);
        router.patch("/api/collections/:collection/records/:id", handleUpdate);
        router.delete("/api/collections/:collection/records/:id", handleDelete);
    }
    
    static void handleList(const HttpRequest& req, HttpResponse& res) {
        QString collection = req.params.value("collection");
        
        if (!isValidCollection(collection)) {
            res.setError(400, "Invalid collection name");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString query = QString("SELECT * FROM %1").arg(collection);
        
        QStringList conditions;
        QVariantMap params;
        
        if (req.query.contains("filter")) {
            parseFilter(req.query, conditions, params);
        }
        
        if (!conditions.isEmpty()) {
            query += " WHERE " + conditions.join(" AND ");
        }
        
        if (req.query.contains("sort")) {
            query += QString(" ORDER BY %1 %2")
                .arg(req.query.mid(5))
                .arg(req.query.contains("order") ? req.query.mid(6) : "ASC");
        }
        
        if (req.query.contains("limit")) {
            query += QString(" LIMIT %1").arg(req.query.mid(6).toInt());
        }
        
        auto results = db.executeQueryMultiple(query, params);
        
        QVariantMap response;
        response["data"] = QVariant(results);
        response["count"] = results.size();
        
        res.setJson(response);
    }
    
    static void handleGet(const HttpRequest& req, HttpResponse& res) {
        QString collection = req.params.value("collection");
        QString id = req.params.value("id");
        
        if (!isValidCollection(collection)) {
            res.setError(400, "Invalid collection name");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString primaryKey = getPrimaryKey(collection);
        
        auto result = db.executeQuery(
            QString("SELECT * FROM %1 WHERE %2 = :id").arg(collection).arg(primaryKey),
            {{"id", id}}
        );
        
        if (result.isEmpty()) {
            res.setError(404, "Record not found");
            return;
        }
        
        res.setJson(result);
    }
    
    static void handleCreate(const HttpRequest& req, HttpResponse& res) {
        QString collection = req.params.value("collection");
        
        if (!isValidCollection(collection)) {
            res.setError(400, "Invalid collection name");
            return;
        }
        
        if (req.body.isEmpty()) {
            res.setError(400, "Request body is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QStringList columns;
        QStringList placeholders;
        QVariantMap params;
        
        for (auto it = req.body.constBegin(); it != req.body.constEnd(); ++it) {
            columns.append(it.key());
            placeholders.append(QString(":%1").arg(it.key()));
            params[it.key()] = it.value();
        }
        
        QString query = QString("INSERT INTO %1 (%2) VALUES (%3)")
            .arg(collection)
            .arg(columns.join(", "))
            .arg(placeholders.join(", "));
        
        db.execute(query, params);
        
        QString id = db.lastInsertId();
        
        res.setStatus(201, "Created");
        res.setJson({{"id", id}, {"success", true}});
    }
    
    static void handleUpdate(const HttpRequest& req, HttpResponse& res) {
        QString collection = req.params.value("collection");
        QString id = req.params.value("id");
        
        if (!isValidCollection(collection)) {
            res.setError(400, "Invalid collection name");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        QString primaryKey = getPrimaryKey(collection);
        
        QStringList sets;
        QVariantMap params = {{"id", id}};
        
        for (auto it = req.body.constBegin(); it != req.body.constEnd(); ++it) {
            sets.append(QString("%1 = :%1").arg(it.key()));
            params[it.key()] = it.value();
        }
        
        if (sets.isEmpty()) {
            res.setError(400, "No fields to update");
            return;
        }
        
        QString query = QString("UPDATE %1 SET %2 WHERE %3 = :id")
            .arg(collection)
            .arg(sets.join(", "))
            .arg(primaryKey);
        
        db.execute(query, params);
        
        res.setJson({{"success", true}});
    }
    
    static void handleDelete(const HttpRequest& req, HttpResponse& res) {
        QString collection = req.params.value("collection");
        QString id = req.params.value("id");
        
        if (!isValidCollection(collection)) {
            res.setError(400, "Invalid collection name");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        QString primaryKey = getPrimaryKey(collection);
        
        db.execute(
            QString("DELETE FROM %1 WHERE %2 = :id").arg(collection).arg(primaryKey),
            {{"id", id}}
        );
        
        res.setJson({{"success", true}});
    }
    
private:
    static bool isValidCollection(const QString& collection) {
        static QStringList validCollections = {
            "users", "albums", "photos", "orders", "bookings",
            "products", "kiosks", "destinations", "settings",
            "session_types", "packs", "expenses", "daily_objectives",
            "login_history", "operation_logs", "sync_sequences",
            "processing_queue", "photographer_ledger", "gallery_orders"
        };
        
        return validCollections.contains(collection);
    }
    
    static QString getPrimaryKey(const QString& collection) {
        static QMap<QString, QString> primaryKeys = {
            {"users", "id"},
            {"albums", "id"},
            {"photos", "id"},
            {"orders", "id"},
            {"bookings", "id"},
            {"products", "id"},
            {"kiosks", "id"},
            {"destinations", "id"},
            {"settings", "key"}
        };
        
        return primaryKeys.value(collection, "id");
    }
    
    static void parseFilter(const QString& query, QStringList& conditions, QVariantMap& params) {
        QString filter = query.mid(7);
        
        QStringList pairs = filter.split('&');
        for (const QString& pair : pairs) {
            int eqIndex = pair.indexOf('=');
            if (eqIndex > 0) {
                QString key = pair.left(eqIndex);
                QString value = pair.mid(eqIndex + 1);
                
                conditions.append(QString("%1 = :%1").arg(key));
                params[key] = value;
            }
        }
    }
};

} // namespace ClickFlash
