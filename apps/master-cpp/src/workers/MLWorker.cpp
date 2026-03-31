#include "workers/MLWorker.h"
#include "core/Logger.h"
#include "database/DatabaseManager.h"
#include <opencv2/opencv.hpp>
#include <random>

namespace ClickFlash {

double MLWorker::analyzePhotoQuality(const QString& photoPath) {
    cv::Mat image = cv::imread(photoPath.toStdString());
    
    if (image.empty()) {
        return 0.5;
    }
    
    cv::Mat gray;
    cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    
    double laplacianVariance = cv::Laplacian(gray, CV_64F).var();
    
    double brightness = cv::mean(gray)[0] / 255.0;
    
    double sharpness = std::min(1.0, laplacianVariance / 1000.0);
    
    double quality = (brightness * 0.3 + sharpness * 0.7);
    
    return std::max(0.0, std::min(1.0, quality));
}

QVector<QVariantMap> MLWorker::autoCullAlbum(const QString& albumId, double threshold) {
    DatabaseManager& db = DatabaseManager::instance();
    
    auto photos = db.executeQueryMultiple(
        "SELECT id, storage_path FROM photos WHERE album_id = :albumId AND culling_status = 'pending'",
        {{"albumId", albumId}}
    );
    
    QVector<QVariantMap> results;
    
    for (const QVariantMap& photo : photos) {
        QString photoId = photo.value("id").toString();
        QString path = photo.value("storage_path").toString();
        
        double score = analyzePhotoQuality(path);
        QString status = score >= threshold ? "approved" : "rejected";
        
        db.execute(
            "UPDATE photos SET culling_status = :status WHERE id = :id",
            {{"status", status}, {"id", photoId}}
        );
        
        db.execute(
            "INSERT OR REPLACE INTO ai_scores (photo_id, score, status) VALUES (:id, :score, :status)",
            {{"id", photoId}, {"score", QString::number(score, 'f', 3)}, {"status", status}}
        );
        
        QVariantMap result;
        result["photoId"] = photoId;
        result["score"] = score;
        result["status"] = status;
        results.append(result);
    }
    
    return results;
}

void MLWorker::trainModel(const QString& modelPath) {
    CF_INFO("ML model training placeholder");
}

} // namespace ClickFlash
