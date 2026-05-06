#include "http/FilesController.h"
#include "http/Router.h"
#include "http/Request.h"
#include "http/Response.h"
#include "core/Logger.h"
#include "core/Config.h"
#include "database/DatabaseManager.h"
#include "workers/WorkerPool.h"

#include <QFile>
#include <QDir>
#include <QCryptographicHash>

namespace ClickFlash {

FilesController::FilesController(QObject* parent)
    : Controller(parent)
{
}

void FilesController::registerRoutes(Router* router) {
    router->post("/api/files/upload", [this](Request& req, Response& res) { uploadFile(req, res); });
    router->get("/api/files/{file_id}", [this](Request& req, Response& res) { getFileInfo(req, res); });
    router->get("/api/files/{file_id}/download", [this](Request& req, Response& res) { downloadFile(req, res); });
    router->delete("/api/files/{file_id}", [this](Request& req, Response& res) { deleteFile(req, res); });
    router->get("/api/files", [this](Request& req, Response& res) { listFiles(req, res); });
    router->post("/api/files/{file_id}/thumbnail", [this](Request& req, Response& res) { generateThumbnail(req, res); });
    router->post("/api/files/{file_id}/process", [this](Request& req, Response& res) { processPhoto(req, res); });
    
    CF_INFO("FilesController routes registered");
}

void FilesController::uploadFile(Request& request, Response& response) {
    QString albumId = request.get("album_id");
    QString photographerId = request.get("photographer_id");
    
    // Get uploaded file data
    QByteArray fileData = request.body();
    if (fileData.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"No file data provided\"}");
        return;
    }
    
    // Generate file ID and path
    QString fileId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString dataDir = Config::instance().getDataDir();
    
    QString albumPath = dataDir + "/albums/" + albumId;
    QDir().mkpath(albumPath);
    
    QString filePath = albumPath + "/" + fileId;
    
    // Write file
    QFile file(filePath);
    if (!file.open(QIODevice::WriteOnly)) {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to save file\"}");
        return;
    }
    file.write(fileData);
    file.close();
    
    // Calculate hash
    QCryptographicHash hash(QCryptographicHash::Md5);
    hash.addData(fileData);
    QString fileHash = hash.result().toHex();
    
    // Get image dimensions (basic)
    QImage img;
    int width = 0, height = 0;
    if (img.loadFromData(fileData)) {
        width = img.width();
        height = img.height();
    }
    
    // Save to database
    QString url = "local://albums/" + albumId + "/" + fileId;
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO photos (id, album_id, url, storage_path, file_hash, width, height, file_size, sync_status, created_at)
            VALUES (:id, :album_id, :url, :storage_path, :hash, :width, :height, :size, 'pending', CURRENT_TIMESTAMP)
        )",
        {
            {"id", fileId},
            {"album_id", albumId},
            {"url", url},
            {"storage_path", filePath},
            {"hash", fileHash},
            {"width", width},
            {"height", height},
            {"size", fileData.size()}
        }
    );
    
    if (success) {
        // Queue thumbnail generation
        WorkerPool::instance().enqueue("thumbnail", {{"photo_id", fileId}, {"storage_path", filePath}});
        
        QJsonObject result;
        result["id"] = fileId;
        result["url"] = url;
        result["size"] = fileData.size();
        result["width"] = width;
        result["height"] = height;
        
        response.setStatus(201);
        response.setJson(result);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to save file metadata\"}");
    }
}

void FilesController::downloadFile(Request& request, Response& response) {
    QString fileId = request.pathParam("file_id");
    
    auto photo = DatabaseManager::instance().executeQuery(
        "SELECT * FROM photos WHERE id = :id",
        {{"id", fileId}}
    );
    
    if (photo.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"File not found\"}");
        return;
    }
    
    QString filePath = photo.value("storage_path").toString();
    QFile file(filePath);
    
    if (!file.exists()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"File not found on disk\"}");
        return;
    }
    
    if (!file.open(QIODevice::ReadOnly)) {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to read file\"}");
        return;
    }
    
    QByteArray data = file.readAll();
    file.close();
    
    response.setBody(data);
    response.setHeader("Content-Type", "image/jpeg");
    response.setHeader("Content-Disposition", "attachment; filename=\"" + fileId + ".jpg\"");
}

void FilesController::deleteFile(Request& request, Response& response) {
    QString fileId = request.pathParam("file_id");
    
    // Get file path first
    auto photo = DatabaseManager::instance().executeQuery(
        "SELECT storage_path FROM photos WHERE id = :id",
        {{"id", fileId}}
    );
    
    if (photo.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"File not found\"}");
        return;
    }
    
    // Delete from disk
    QString filePath = photo.value("storage_path").toString();
    QFile::remove(filePath);
    
    // Delete from database
    bool success = DatabaseManager::instance().execute(
        "DELETE FROM photos WHERE id = :id",
        {{"id", fileId}}
    );
    
    if (success) {
        response.setStatus(204);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to delete file\"}");
    }
}

void FilesController::listFiles(Request& request, Response& response) {
    QString albumId = request.get("album_id");
    int page = request.get("page", "1").toInt();
    int limit = request.get("limit", "50").toInt();
    QString status = request.get("status");
    
    if (albumId.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"album_id required\"}");
        return;
    }
    
    QString query = "SELECT * FROM photos WHERE album_id = :album_id";
    if (!status.isEmpty()) {
        query += " AND culling_status = :status";
    }
    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
    
    QVariantMap params = {
        {"album_id", albumId},
        {"limit", limit},
        {"offset", (page - 1) * limit}
    };
    if (!status.isEmpty()) {
        params["status"] = status;
    }
    
    auto photos = DatabaseManager::instance().executeQueryMultiple(query, params);
    
    QJsonArray photoArray;
    for (const auto& photo : photos) {
        QJsonObject p;
        p["id"] = photo.value("id").toString();
        p["url"] = photo.value("url").toString();
        p["thumbnail_url"] = photo.value("thumbnail_url").toString();
        p["width"] = photo.value("width").toInt();
        p["height"] = photo.value("height").toInt();
        p["file_size"] = photo.value("file_size").toLongLong();
        p["culling_status"] = photo.value("culling_status").toString();
        photoArray.append(p);
    }
    
    QJsonObject result;
    result["photos"] = photoArray;
    result["page"] = page;
    result["limit"] = limit;
    
    response.setJson(result);
}

void FilesController::getFileInfo(Request& request, Response& response) {
    QString fileId = request.pathParam("file_id");
    
    auto photo = DatabaseManager::instance().executeQuery(
        "SELECT * FROM photos WHERE id = :id",
        {{"id", fileId}}
    );
    
    if (photo.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"File not found\"}");
        return;
    }
    
    QJsonObject result;
    result["id"] = photo.value("id").toString();
    result["album_id"] = photo.value("album_id").toString();
    result["url"] = photo.value("url").toString();
    result["thumbnail_url"] = photo.value("thumbnail_url").toString();
    result["preview_url"] = photo.value("preview_url").toString();
    result["width"] = photo.value("width").toInt();
    result["height"] = photo.value("height").toInt();
    result["file_size"] = photo.value("file_size").toLongLong();
    result["file_hash"] = photo.value("file_hash").toString();
    result["culling_status"] = photo.value("culling_status").toString();
    result["sync_status"] = photo.value("sync_status").toString();
    result["created_at"] = photo.value("created_at").toString();
    
    response.setJson(result);
}

void FilesController::generateThumbnail(Request& request, Response& response) {
    QString fileId = request.pathParam("file_id");
    
    auto photo = DatabaseManager::instance().executeQuery(
        "SELECT storage_path FROM photos WHERE id = :id",
        {{"id", fileId}}
    );
    
    if (photo.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"File not found\"}");
        return;
    }
    
    // Queue thumbnail generation
    WorkerPool::instance().enqueue("thumbnail", {
        {"photo_id", fileId},
        {"storage_path", photo.value("storage_path").toString()}
    });
    
    QJsonObject result;
    result["photo_id"] = fileId;
    result["status"] = "queued";
    
    response.setJson(result);
}

void FilesController::processPhoto(Request& request, Response& response) {
    QString fileId = request.pathParam("file_id");
    QJsonObject body = request.jsonBody();
    
    QStringList operations;
    operations << body.value("operations").toString().split(',');
    
    auto photo = DatabaseManager::instance().executeQuery(
        "SELECT storage_path FROM photos WHERE id = :id",
        {{"id", fileId}}
    );
    
    if (photo.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"File not found\"}");
        return;
    }
    
    // Queue processing jobs
    for (const QString& op : operations) {
        QString workerType = op.trimmed();
        if (workerType == "thumbnail") {
            WorkerPool::instance().enqueue("thumbnail", {{"photo_id", fileId}});
        } else if (workerType == "watermark") {
            WorkerPool::instance().enqueue("watermark", {{"photo_id", fileId}});
        } else if (workerType == "faces") {
            WorkerPool::instance().enqueue("face", {{"photo_id", fileId}});
        }
    }
    
    QJsonObject result;
    result["photo_id"] = fileId;
    result["operations"] = QJsonArray::fromStringList(operations);
    result["status"] = "queued";
    
    response.setJson(result);
}

} // namespace ClickFlash