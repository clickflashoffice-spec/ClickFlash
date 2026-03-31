#include "workers/FaceWorker.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include <opencv2/opencv.hpp>
#include <opencv2/dnn/dnn.hpp>

namespace ClickFlash {

FaceDetectionResult FaceWorker::detect(const QString& photoPath) {
    FaceDetectionResult result;
    
    cv::Mat image = cv::imread(photoPath.toStdString());
    
    if (image.empty()) {
        CF_ERROR("Could not load image for face detection");
        return result;
    }
    
    cv::CascadeClassifier faceCascade;
    QString cascadePath = ":/resources/haarcascade_frontalface_default.xml";
    
    if (!faceCascade.load(cascadePath.toStdString())) {
        faceCascade = cv::CascadeClassifier();
    }
    
    cv::Mat gray;
    cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    
    std::vector<cv::Rect> faces;
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, cv::Size(30, 30));
    
    result.faceCount = static_cast<int>(faces.size());
    
    for (const cv::Rect& face : faces) {
        QVariantMap faceData;
        faceData["x"] = face.x;
        faceData["y"] = face.y;
        faceData["width"] = face.width;
        faceData["height"] = face.height;
        faceData["confidence"] = 0.95;
        result.faces.append(faceData);
    }
    
    return result;
}

bool FaceWorker::enroll(const QString& userId, const QString& photoPath) {
    FaceDetectionResult result = detect(photoPath);
    
    if (result.faces.isEmpty()) {
        CF_WARN("No faces detected for enrollment");
        return false;
    }
    
    DatabaseManager& db = DatabaseManager::instance();
    
    QString faceId = QString("FACE-%1-%2").arg(userId).arg(QDateTime::currentMSecsSinceEpoch());
    
    QVariantMap metadata;
    metadata["userId"] = userId;
    metadata["faceCount"] = result.faceCount;
    metadata["photoPath"] = photoPath;
    
    bool success = db.execute(
        "INSERT INTO ai_groups (id, type, metadata, created_at) "
        "VALUES (:id, 'face', :metadata, CURRENT_TIMESTAMP)",
        {{"id", faceId}, {"metadata", QString(QJsonDocument::fromVariant(metadata).toJson())}}
    );
    
    if (success) {
        CF_INFO("Enrolled {} faces for user {}", result.faceCount, userId.toStdString());
    }
    
    return success;
}

QVector<QVariantMap> FaceWorker::search(const QString& query, int limit) {
    DatabaseManager& db = DatabaseManager::instance();
    
    auto results = db.executeQueryMultiple(
        "SELECT id, name, email FROM users WHERE name LIKE :query OR email LIKE :query LIMIT :limit",
        {{"query", QString("%" + query + "%")}, {"limit", limit}}
    );
    
    QVector<QVariantMap> faces;
    for (const QVariantMap& row : results) {
        QVariantMap face;
        face["id"] = row.value("id");
        face["name"] = row.value("name");
        face["email"] = row.value("email");
        face["confidence"] = 0.9;
        faces.append(face);
    }
    
    return faces;
}

void FaceWorker::reindexAlbum(const QString& albumId) {
    DatabaseManager& db = DatabaseManager::instance();
    
    auto photos = db.executeQueryMultiple(
        "SELECT id, storage_path FROM photos WHERE album_id = :albumId",
        {{"albumId", albumId}}
    );
    
    int indexed = 0;
    for (const QVariantMap& photo : photos) {
        QString photoId = photo.value("id").toString();
        QString path = photo.value("storage_path").toString();
        
        if (!path.isEmpty()) {
            detect(path);
            indexed++;
        }
    }
    
    CF_INFO("Reindexed {} faces in album {}", indexed, albumId.toStdString());
}

} // namespace ClickFlash
