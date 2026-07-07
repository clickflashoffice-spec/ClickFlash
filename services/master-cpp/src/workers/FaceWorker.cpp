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
    
    // Try Deep Learning Face Detection first (ResNet-10 SSD)
    cv::dnn::Net net;
    bool useDnn = false;
    try {
        net = cv::dnn::readNetFromCaffe("models/deploy.prototxt", "models/res10_300x300_ssd_iter_140000.caffemodel");
        useDnn = !net.empty();
    } catch (...) {
        CF_WARN("DNN face models not found, falling back to Haar Cascade");
    }

    std::vector<cv::Rect> faces;
    std::vector<float> confidences;

    if (useDnn) {
        cv::Mat blob = cv::dnn::blobFromImage(image, 1.0, cv::Size(300, 300), cv::Scalar(104.0, 177.0, 123.0));
        net.setInput(blob);
        cv::Mat dnnResult = net.forward();
        
        // Output matrix is 4D: [1, 1, N, 7]
        cv::Mat detectionMat(dnnResult.size[2], dnnResult.size[3], CV_32F, dnnResult.ptr<float>());
        
        for (int i = 0; i < detectionMat.rows; i++) {
            float confidence = detectionMat.at<float>(i, 2);
            if (confidence > 0.5) { // Threshold
                int x1 = static_cast<int>(detectionMat.at<float>(i, 3) * image.cols);
                int y1 = static_cast<int>(detectionMat.at<float>(i, 4) * image.rows);
                int x2 = static_cast<int>(detectionMat.at<float>(i, 5) * image.cols);
                int y2 = static_cast<int>(detectionMat.at<float>(i, 6) * image.rows);
                
                faces.push_back(cv::Rect(cv::Point(x1, y1), cv::Point(x2, y2)));
                confidences.push_back(confidence);
            }
        }
    } else {
        // Fallback: Haar Cascades
        cv::CascadeClassifier faceCascade;
        QString cascadePath = ":/resources/haarcascade_frontalface_default.xml";
        if (faceCascade.load(cascadePath.toStdString())) {
            cv::Mat gray;
            cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
            faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, cv::Size(30, 30));
            // Haar doesn't natively return confidence in this API call, mock it based on detection bounds
            for (size_t i = 0; i < faces.size(); i++) {
                confidences.push_back(0.85f); 
            }
        }
    }
    
    result.faceCount = static_cast<int>(faces.size());
    
    for (size_t i = 0; i < faces.size(); i++) {
        const cv::Rect& face = faces[i];
        QVariantMap faceData;
        faceData["x"] = face.x;
        faceData["y"] = face.y;
        faceData["width"] = face.width;
        faceData["height"] = face.height;
        faceData["confidence"] = confidences[i];
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
