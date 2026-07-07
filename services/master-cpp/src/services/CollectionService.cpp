#include "services/CollectionService.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include <QUuid>
#include <QDateTime>

namespace ClickFlash {

QJsonArray CollectionService::list(const QString& collection, const QJsonObject& filters) {
    QString table = mapCollectionToTable(collection);
    if (table.isEmpty()) {
        CF_WARN("Unknown collection: {}", collection.toStdString());
        return QJsonArray();
    }

    DatabaseManager& db = DatabaseManager::instance();

    QString sql = QString("SELECT * FROM %1").arg(table);

    QVariantMap params;

    if (!filters.isEmpty()) {
        QStringList conditions;
        for (auto it = filters.begin(); it != filters.end(); ++it) {
            conditions.append(QString("%1 = :%1").arg(it.key()));
            params[it.key()] = it.value().toVariant();
        }
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    if (filters.contains("limit")) {
        sql += " LIMIT :limit";
        params["limit"] = filters.value("limit").toInt();
    }

    if (filters.contains("offset")) {
        sql += " OFFSET :offset";
        params["offset"] = filters.value("offset").toInt();
    }

    auto results = db.executeQueryMultiple(sql, params);

    QJsonArray items;
    for (const auto& row : results) {
        items.append(mapRowToObject(row));
    }

    return items;
}

QJsonObject CollectionService::get(const QString& collection, const QString& id) {
    QString table = mapCollectionToTable(collection);
    if (table.isEmpty()) {
        return QJsonObject();
    }

    DatabaseManager& db = DatabaseManager::instance();

    auto result = db.executeQuery(
        QString("SELECT * FROM %1 WHERE id = :id OR uuid = :uuid").arg(table),
        {{"id", id}, {"uuid", id}}
    );

    if (result.isEmpty()) {
        return QJsonObject();
    }

    return mapRowToObject(result);
}

QJsonObject CollectionService::create(const QString& collection, const QJsonObject& data) {
    QString table = mapCollectionToTable(collection);
    if (table.isEmpty()) {
        return QJsonObject();
    }

    DatabaseManager& db = DatabaseManager::instance();

    QJsonObject record = data;
    if (!data.contains("uuid")) {
        record["uuid"] = QUuid::createUuid().toString(QUuid::WithoutBraces);
    }
    if (!data.contains("created_at")) {
        record["created_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    }
    if (!data.contains("updated_at")) {
        record["updated_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    }

    QVariantMap params;
    QStringList fields;
    QStringList placeholders;

    for (auto it = record.begin(); it != record.end(); ++it) {
        fields.append(it.key());
        placeholders.append(":" + it.key());
        params[it.key()] = it.value().toVariant();
    }

    QString sql = QString("INSERT INTO %1 (%2) VALUES (%3)").arg(table, fields.join(", "), placeholders.join(", "));

    if (!db.execute(sql, params)) {
        CF_ERROR("Failed to create record in {}", table.toStdString());
        return QJsonObject();
    }

    QString lastId = db.lastInsertId();
    record["id"] = lastId.toInt();

    CF_DEBUG("Created record in {}: {}", table.toStdString(), lastId.toStdString());

    return record;
}

QJsonObject CollectionService::update(const QString& collection, const QString& id, const QJsonObject& data) {
    QString table = mapCollectionToTable(collection);
    if (table.isEmpty()) {
        return QJsonObject();
    }

    DatabaseManager& db = DatabaseManager::instance();

    QJsonObject record = data;
    record["updated_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);

    QVariantMap params;
    QStringList setClauses;

    for (auto it = record.begin(); it != record.end(); ++it) {
        setClauses.append(QString("%1 = :set_%2").arg(it.key(), it.key()));
        params[QString("set_%1").arg(it.key())] = it.value().toVariant();
    }

    params["id"] = id;
    params["uuid"] = id;

    QString sql = QString("UPDATE %1 SET %2 WHERE id = :id OR uuid = :uuid").arg(table, setClauses.join(", "));

    if (!db.execute(sql, params)) {
        CF_ERROR("Failed to update record in {}", table.toStdString());
        return QJsonObject();
    }

    CF_DEBUG("Updated record in {}: {}", table.toStdString(), id.toStdString());

    return get(collection, id);
}

bool CollectionService::remove(const QString& collection, const QString& id) {
    QString table = mapCollectionToTable(collection);
    if (table.isEmpty()) {
        return false;
    }

    DatabaseManager& db = DatabaseManager::instance();

    bool success = db.execute(
        QString("DELETE FROM %1 WHERE id = :id OR uuid = :uuid").arg(table),
        {{"id", id}, {"uuid", id}}
    );

    if (success) {
        CF_DEBUG("Deleted record from {}: {}", table.toStdString(), id.toStdString());
    }

    return success;
}

QJsonArray CollectionService::query(const QString& collection, const QString& sql, const QJsonObject& params) {
    Q_UNUSED(collection);
    Q_UNUSED(sql);
    Q_UNUSED(params);
    return QJsonArray();
}

QJsonArray CollectionService::getAlbums(const QJsonObject& filters) {
    return list("albums", filters);
}

QJsonArray CollectionService::getPhotos(const QString& albumId, const QJsonObject& filters) {
    QJsonObject allFilters = filters;
    if (!albumId.isEmpty()) {
        allFilters["album_id"] = albumId;
    }
    return list("photos", allFilters);
}

QJsonArray CollectionService::getOrders(const QJsonObject& filters) {
    return list("orders", filters);
}

QJsonArray CollectionService::getBookings(const QJsonObject& filters) {
    return list("bookings", filters);
}

QJsonArray CollectionService::getUsers(const QJsonObject& filters) {
    return list("users", filters);
}

QJsonArray CollectionService::getProducts(const QJsonObject& filters) {
    return list("products", filters);
}

QJsonArray CollectionService::getKiosks(const QJsonObject& filters) {
    return list("kiosks", filters);
}

QString CollectionService::mapCollectionToTable(const QString& collection) {
    static QMap<QString, QString> mapping = {
        {"users", "users"},
        {"albums", "albums"},
        {"photos", "photos"},
        {"orders", "orders"},
        {"order_items", "order_items"},
        {"products", "products"},
        {"bookings", "bookings"},
        {"session_types", "session_types"},
        {"packs", "packs"},
        {"destinations", "destinations"},
        {"kiosks", "kiosks"},
        {"settings", "settings"},
        {"expenses", "expenses"},
        {"daily_objectives", "daily_objectives"},
        {"login_history", "login_history"},
        {"operation_logs", "operation_logs"},
        {"sync_sequences", "sync_sequences"},
        {"photographer_ledger", "photographer_ledger"},
        {"gallery_tokens", "gallery_tokens"},
        {"gallery_orders", "gallery_orders"},
        {"marketing_campaigns", "marketing_campaigns"},
        {"assistance_requests", "assistance_requests"},
        {"processing_queue", "processing_queue"},
        {"fulfillment_queue", "fulfillment_queue"},
        {"ai_scores", "ai_scores"},
        {"ai_groups", "ai_groups"},
        {"faces", "faces"},
        {"face_persons", "face_persons"}
    };

    return mapping.value(collection, "");
}

QJsonObject CollectionService::mapRowToObject(const QVariantMap& row) {
    QJsonObject obj;
    for (auto it = row.begin(); it != row.end(); ++it) {
        obj[it.key()] = QJsonValue::fromVariant(it.value());
    }
    return obj;
}

} // namespace ClickFlash
