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
    
    // 1. Sharpness (Laplacian variance)
    cv::Mat gray;
    cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    cv::Mat laplacian;
    cv::Laplacian(gray, laplacian, CV_64F);
    cv::Scalar mean, stddev;
    cv::meanStdDev(laplacian, mean, stddev);
    double laplacianVariance = stddev.val[0] * stddev.val[0];
    double sharpness = std::min(1.0, laplacianVariance / 1500.0);
    
    // 2. Exposure (Check for under/over exposure)
    cv::meanStdDev(gray, mean, stddev);
    double brightness = mean.val[0] / 255.0;
    double exposurePenalty = 0.0;
    if (brightness < 0.2) exposurePenalty = (0.2 - brightness) * 2.0; // Too dark
    if (brightness > 0.8) exposurePenalty = (brightness - 0.8) * 2.0; // Too bright
    
    // 3. Colorfulness (Hasler and Suesstrunk metric)
    cv::Mat lab;
    cv::cvtColor(image, lab, cv::COLOR_BGR2Lab);
    std::vector<cv::Mat> lab_planes;
    cv::split(lab, lab_planes);
    cv::Scalar mean_a, stddev_a, mean_b, stddev_b;
    cv::meanStdDev(lab_planes[1], mean_a, stddev_a);
    cv::meanStdDev(lab_planes[2], mean_b, stddev_b);
    double stdRoot = std::sqrt(stddev_a.val[0]*stddev_a.val[0] + stddev_b.val[0]*stddev_b.val[0]);
    double meanRoot = std::sqrt(mean_a.val[0]*mean_a.val[0] + mean_b.val[0]*mean_b.val[0]);
    double colorfulness = stdRoot + (0.3 * meanRoot);
    double colorScore = std::min(1.0, colorfulness / 100.0);
    
    // Weighted final quality score
    double quality = (sharpness * 0.55) + (colorScore * 0.25) + ((1.0 - exposurePenalty) * 0.20);
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
    CF_INFO("Initializing SVM model training pipeline targeting {}", modelPath.toStdString());
    
    // OpenCV ML SVM Scaffold
    cv::Ptr<cv::ml::SVM> svm = cv::ml::SVM::create();
    svm->setType(cv::ml::SVM::C_SVC);
    svm->setKernel(cv::ml::SVM::RBF);
    svm->setTermCriteria(cv::TermCriteria(cv::TermCriteria::MAX_ITER, 100, 1e-6));
    
    // Placeholder for actual feature extraction from DB 'ai_scores'
    // 10 mock samples, 3 features (sharpness, exposure, color)
    cv::Mat trainingData = cv::Mat::zeros(10, 3, CV_32F); 
    cv::Mat labels = cv::Mat::zeros(10, 1, CV_32S); // Mock labels (1=approve, 0=reject)
    
    try {
        svm->train(trainingData, cv::ml::ROW_SAMPLE, labels);
        svm->save(modelPath.toStdString());
        CF_INFO("Successfully trained and saved model to {}", modelPath.toStdString());
    } catch (const cv::Exception& e) {
        CF_ERROR("Failed to train model: {}", e.what());
    }
}

} // namespace ClickFlash
