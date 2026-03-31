#include "services/SyncService.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include "core/Config.h"
#include <QUuid>
#include <QDateTime>
#include <QCryptographicHash>

namespace ClickFlash {

QJsonObject SyncService::pushMutation(const QJsonObject& mutationData, const QString& kioskId) {
    QJsonObject result;

    QString operationId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString entityType = mutationData.value("entity_type").toString();
    QString entityUuid = mutationData.value("entity_uuid").toString();
    QString operation = mutationData.value("operation").toString();
    QJsonObject data = mutationData.value("data").toObject();
    QString clientTimestamp = mutationData.value("client_timestamp").toString();

    if (entityType.isEmpty() || entityUuid.isEmpty() || operation.isEmpty()) {
        result["error"] = "Missing required fields";
        return result;
    }

    DatabaseManager& db = DatabaseManager::instance();

    QString nodeId = kioskId.isEmpty() ? "master" : kioskId;
    qint64 sequence = getCurrentSequence(nodeId) + 1;

    db.execute(
        "INSERT INTO operation_logs (uuid, entity_type, entity_uuid, operation, data_json, client_timestamp, server_timestamp, synced, created_at) VALUES (:uuid, :entityType, :entityUuid, :operation, :dataJson, :clientTimestamp, :serverTimestamp, 0, :now)",
        {
            {"uuid", operationId},
            {"entityType", entityType},
            {"entityUuid", entityUuid},
            {"operation", operation},
            {"dataJson", QString(QJsonDocument(data).toJson(QJsonDocument::Compact))},
            {"clientTimestamp", clientTimestamp},
            {"serverTimestamp", QDateTime::currentDateTime().toString(Qt::ISODate)},
            {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}
        }
    );

    if (operation == "create" || operation == "update") {
        QString table = CollectionService::mapCollectionToTable(entityType);
        if (!table.isEmpty()) {
            QJsonObject record = data;
            record["updated_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
            
            auto existing = db.executeQuery(
                QString("SELECT id FROM %1 WHERE uuid = :uuid").arg(table),
                {{"uuid", entityUuid}}
            );
            
            if (existing.isEmpty()) {
                record["uuid"] = entityUuid;
                record["created_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
                CollectionService::create(entityType, record);
            } else {
                CollectionService::update(entityType, entityUuid, record);
            }
        }
    } else if (operation == "delete") {
        QString table = CollectionService::mapCollectionToTable(entityType);
        if (!table.isEmpty()) {
            CollectionService::remove(entityType, entityUuid);
        }
    }

    advanceSequence(nodeId);

    CF_DEBUG("Push mutation: {} {} {} ", operation.toStdString(), entityType.toStdString(), entityUuid.toStdString());

    result["operation_id"] = operationId;
    result["sequence"] = sequence;
    result["status"] = "accepted";

    return result;
}

QJsonObject SyncService::pullChanges(const QJsonObject& requestData, const QString& kioskId) {
    QJsonObject result;

    QString nodeId = kioskId.isEmpty() ? "master" : kioskId;
    qint64 lastSequence = requestData.value("last_sequence").toDouble();

    DatabaseManager& db = DatabaseManager::instance();

    auto operations = db.executeQueryMultiple(
        "SELECT * FROM operation_logs WHERE synced = 0 AND server_timestamp > (SELECT last_synced_at FROM sync_sequences WHERE node_id = :nodeId) ORDER BY server_timestamp ASC",
        {{"nodeId", nodeId}}
    );

    QJsonArray changes;
    for (const auto& op : operations) {
        changes.append(QJsonObject{
            {"id", op.value("id")},
            {"uuid", op.value("uuid")},
            {"entity_type", op.value("entity_type")},
            {"entity_uuid", op.value("entity_uuid")},
            {"operation", op.value("operation")},
            {"data", QJsonDocument::fromJson(op.value("data_json").toByteArray()).object()},
            {"client_timestamp", op.value("client_timestamp")},
            {"server_timestamp", op.value("server_timestamp")}
        });
    }

    qint64 currentSequence = getCurrentSequence(nodeId);

    result["changes"] = changes;
    result["current_sequence"] = currentSequence;
    result["node_id"] = nodeId;

    db.execute(
        "INSERT OR REPLACE INTO sync_sequences (node_id, sequence_number, last_synced_at) VALUES (:nodeId, :sequence, :now)",
        {{"nodeId", nodeId}, {"sequence", currentSequence}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    CF_DEBUG("Pull changes for {}: {} operations", nodeId.toStdString(), changes.size());

    return result;
}

QJsonObject SyncService::getSyncStatus() {
    DatabaseManager& db = DatabaseManager::instance();

    auto sequences = db.executeQueryMultiple("SELECT * FROM sync_sequences");

    QJsonArray nodes;
    for (const auto& seq : sequences) {
        nodes.append(QJsonObject{
            {"node_id", seq.value("node_id")},
            {"sequence_number", seq.value("sequence_number")},
            {"last_synced_at", seq.value("last_synced_at")}
        });
    }

    auto pendingResult = db.executeQuery("SELECT COUNT(*) as count FROM operation_logs WHERE synced = 0");
    int pendingCount = pendingResult.value("count").toInt();

    return QJsonObject{
        {"nodes", nodes},
        {"pending_operations", pendingCount},
        {"master_sequence", getCurrentSequence("master")}
    };
}

bool SyncService::resolveConflict(const QString& entityType, const QString& entityId, const QJsonObject& resolution) {
    Q_UNUSED(entityType);
    Q_UNUSED(entityId);
    Q_UNUSED(resolution);
    return true;
}

QJsonArray SyncService::getPendingOperations() {
    DatabaseManager& db = DatabaseManager::instance();

    auto operations = db.executeQueryMultiple(
        "SELECT * FROM operation_logs WHERE synced = 0 ORDER BY created_at ASC"
    );

    QJsonArray pending;
    for (const auto& op : operations) {
        pending.append(QJsonObject{
            {"uuid", op.value("uuid")},
            {"entity_type", op.value("entity_type")},
            {"entity_uuid", op.value("entity_uuid")},
            {"operation", op.value("operation")},
            {"created_at", op.value("created_at")}
        });
    }

    return pending;
}

bool SyncService::markSynced(const QString& operationId) {
    DatabaseManager& db = DatabaseManager::instance();

    return db.execute(
        "UPDATE operation_logs SET synced = 1 WHERE uuid = :uuid",
        {{"uuid", operationId}}
    );
}

qint64 SyncService::getCurrentSequence(const QString& nodeId) {
    DatabaseManager& db = DatabaseManager::instance();

    auto result = db.executeQuery(
        "SELECT sequence_number FROM sync_sequences WHERE node_id = :nodeId",
        {{"nodeId", nodeId}}
    );

    if (result.isEmpty()) {
        return 0;
    }

    return result.value("sequence_number").toLongLong();
}

QJsonObject SyncService::advanceSequence(const QString& nodeId) {
    DatabaseManager& db = DatabaseManager::instance();

    qint64 current = getCurrentSequence(nodeId);
    qint64 next = current + 1;

    db.execute(
        "INSERT OR REPLACE INTO sync_sequences (node_id, sequence_number, last_synced_at) VALUES (:nodeId, :sequence, :now)",
        {{"nodeId", nodeId}, {"sequence", next}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    return QJsonObject{
        {"node_id", nodeId},
        {"previous_sequence", current},
        {"current_sequence", next}
    };
}

} // namespace ClickFlash
