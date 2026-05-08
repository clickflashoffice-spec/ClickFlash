#include "services/PhotoService.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

#include <QUuid>
#include <QFile>

namespace ClickFlash {

QVariantMap PhotoService::getPhoto(const QString& id) {
    return DatabaseManager::instance().executeQuery(
        "SELECT * FROM photos WHERE id = :id",
        {{"id", id}}
    );
}

QList<QVariantMap> PhotoService::getPhotos(const QString& albumId, int page, int limit) {
    return DatabaseManager::instance().executeQueryMultiple(
        R"(
            SELECT * FROM photos 
            WHERE album_id = :album_id 
            ORDER BY created_at DESC 
            LIMIT :limit OFFSET :offset
        )",
        {
            {"album_id", albumId},
            {"limit", limit},
            {"offset", (page - 1) * limit}
        }
    );
}

QVariantMap PhotoService::createPhoto(const QVariantMap& data) {
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO photos (id, album_id, url, title, photographer_id, category, storage_path, file_size, width, height, created_at)
            VALUES (:id, :album_id, :url, :title, :photographer_id, :category, :storage_path, :file_size, :width, :height, CURRENT_TIMESTAMP)
        )",
        {
            {"id", id},
            {"album_id", data.value("album_id")},
            {"url", data.value("url")},
            {"title", data.value("title")},
            {"photographer_id", data.value("photographer_id")},
            {"category", data.value("category")},
            {"storage_path", data.value("storage_path")},
            {"file_size", data.value("file_size")},
            {"width", data.value("width")},
            {"height", data.value("height")}
        }
    );
    
    if (success) {
        // Update album photo count
        DatabaseManager::instance().execute(
            "UPDATE albums SET photo_count = photo_count + 1 WHERE id = :album_id",
            {{"album_id", data.value("album_id").toString()}}
        );
        
        emit photoCreated(id);
        
        QVariantMap result;
        result["id"] = id;
        result["success"] = true;
        return result;
    }
    
    return QVariantMap{{"success", false}};
}

bool PhotoService::updatePhoto(const QString& id, const QVariantMap& data) {
    QStringList sets;
    QVariantMap params;
    
    for (auto it = data.constBegin(); it != data.constEnd(); ++it) {
        sets.append(it.key() + " = :" + it.key());
        params[it.key()] = it.value();
    }
    
    if (sets.isEmpty()) return false;
    
    params["id"] = id;
    
    bool success = DatabaseManager::instance().execute(
        "UPDATE photos SET " + sets.join(", ") + ", updated_at = CURRENT_TIMESTAMP WHERE id = :id",
        params
    );
    
    if (success) {
        emit photoUpdated(id);
    }
    
    return success;
}

bool PhotoService::deletePhoto(const QString& id) {
    // Get album_id first
    auto photo = DatabaseManager::instance().executeQuery(
        "SELECT album_id, storage_path FROM photos WHERE id = :id",
        {{"id", id}}
    );
    
    if (photo.isEmpty()) return false;
    
    QString albumId = photo.value("album_id").toString();
    QString storagePath = photo.value("storage_path").toString();
    
    // Delete file from disk
    QFile::remove(storagePath);
    
    // Delete from database
    bool success = DatabaseManager::instance().execute(
        "DELETE FROM photos WHERE id = :id",
        {{"id", id}}
    );
    
    if (success) {
        // Update album photo count
        DatabaseManager::instance().execute(
            "UPDATE albums SET photo_count = photo_count - 1 WHERE id = :album_id",
            {{"album_id", albumId}}
        );
        
        emit photoDeleted(id);
    }
    
    return success;
}

QList<QVariantMap> PhotoService::getPhotosByStatus(const QString& albumId, const QString& status) {
    return DatabaseManager::instance().executeQueryMultiple(
        R"(
            SELECT * FROM photos 
            WHERE album_id = :album_id AND culling_status = :status
            ORDER BY created_at DESC
        )",
        {{"album_id", albumId}, {"status", status}}
    );
}

bool PhotoService::updatePhotoStatus(const QString& id, const QString& status) {
    bool success = DatabaseManager::instance().execute(
        "UPDATE photos SET culling_status = :status WHERE id = :id",
        {{"status", status}, {"id", id}}
    );
    
    if (success) {
        emit photoStatusChanged(id, status);
    }
    
    return success;
}

QList<QVariantMap> PhotoService::searchPhotos(const QString& query, const QString& albumId) {
    QString sql = "SELECT * FROM photos WHERE 1=1";
    QVariantMap params;
    
    if (!query.isEmpty()) {
        sql += " AND (title LIKE :query OR category LIKE :query)";
        params["query"] = "%" + query + "%";
    }
    
    if (!albumId.isEmpty()) {
        sql += " AND album_id = :album_id";
        params["album_id"] = albumId;
    }
    
    sql += " ORDER BY created_at DESC LIMIT 100";
    
    return DatabaseManager::instance().executeQueryMultiple(sql, params);
}

} // namespace ClickFlash