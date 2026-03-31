#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include <QDateTime>
#include <QCryptographicHash>

namespace ClickFlash {

class SyncController {
public:
    static void registerRoutes(Router& router) {
        router.post("/api/sync/mutation", handleMutation);
        router.get("/api/sync/status", handleStatus);
        router.post("/api/sync/resolve", handleResolve);
    }
    
    static void handleMutation(const HttpRequest& req, HttpResponse& res) {
        QString kioskId = req.getHeader("X-Kiosk-ID");
        QString timestamp = req.getHeader("X-Timestamp");
        QString signature = req.getHeader("X-Signature");
        
        if (!verifySignature(kioskId, timestamp, signature, req.body)) {
            res.setError(401, "Invalid signature");
            return;
        }
        
        if (!verifyTimestamp(timestamp)) {
            res.setError(401, "Request expired");
            return;
        }
        
        QString operationType = req.body.value("type").toString();
        QString tableName = req.body.value("table").toString();
        QString recordId = req.body.value("id").toString();
        QVariantMap data = req.body.value("data").toMap();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "INSERT INTO operation_logs (operation_type, table_name, record_id, data) "
            "VALUES (:type, :table, :id, :data)",
            {{"type", operationType}, {"table", tableName}, {"id", recordId}, 
             {"data", QString(QJsonDocument::fromVariant(data).toJson())}}
        );
        
        incrementVectorClock(kioskId);
        
        QVariantMap response;
        response["success"] = true;
        response["timestamp"] = QDateTime::currentMSecsSinceEpoch();
        response["vectorClock"] = getVectorClock(kioskId);
        
        res.setJson(response);
    }
    
    static void handleStatus(const HttpRequest& req, HttpResponse& res) {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto pendingCount = db.executeQuery(
            "SELECT COUNT(*) as count FROM operation_logs WHERE synced = 0"
        );
        
        auto lastSync = db.executeQuery(
            "SELECT MAX(created_at) as last FROM operation_logs WHERE synced = 1"
        );
        
        QVariantMap status;
        status["pendingMutations"] = pendingCount.value("count");
        status["lastSyncTime"] = lastSync.value("last");
        status["connected"] = true;
        
        res.setJson(status);
    }
    
    static void handleResolve(const HttpRequest& req, HttpResponse& res) {
        QStringList conflictIds = req.body.value("conflicts").toStringList();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        for (const QString& id : conflictIds) {
            db.execute(
                "UPDATE operation_logs SET synced = 1 WHERE id = :id",
                {{"id", id}}
            );
        }
        
        res.setJson({{"resolved", conflictIds.size()}});
    }

private:
    static bool verifySignature(const QString& kioskId, const QString& timestamp, 
                              const QString& signature, const QVariantMap& body) {
        if (kioskId.isEmpty() || timestamp.isEmpty() || signature.isEmpty()) {
            return false;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto kiosk = db.executeQuery(
            "SELECT pairing_secret FROM kiosks WHERE id = :id AND status = 'paired'",
            {{"id", kioskId}}
        );
        
        if (kiosk.isEmpty()) {
            return false;
        }
        
        QString secret = kiosk.value("pairing_secret").toString();
        
        QString data = QString("%1:%2:%3").arg(kioskId).arg(timestamp)
            .arg(QString(QJsonDocument::fromVariant(body).toJson()));
        
        QByteArray hash = QCryptographicHash::hash(
            data.toUtf8(), 
            QCryptographicHash::Sha256
        );
        
        return hash.toHex() == signature;
    }
    
    static bool verifyTimestamp(const QString& timestamp) {
        qint64 ts = timestamp.toLongLong();
        qint64 now = QDateTime::currentSecsSinceEpoch();
        
        qint64 diff = qAbs(now - ts);
        return diff < 300;
    }
    
    static void incrementVectorClock(const QString& nodeId) {
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "INSERT OR REPLACE INTO sync_sequences (node_id, sequence_number, updated_at) "
            "VALUES (:node, (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM sync_sequences WHERE node_id = :node), CURRENT_TIMESTAMP)",
            {{"node", nodeId}}
        );
    }
    
    static QVariantMap getVectorClock(const QString& nodeId) {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto sequences = db.executeQueryMultiple(
            "SELECT node_id, sequence_number FROM sync_sequences"
        );
        
        QVariantMap clock;
        for (const QVariantMap& row : sequences) {
            clock[row.value("node_id").toString()] = row.value("sequence_number");
        }
        
        return clock;
    }
};

} // namespace ClickFlash
