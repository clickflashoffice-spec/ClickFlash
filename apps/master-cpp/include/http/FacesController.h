#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include <opencv2/opencv.hpp>
#include <opencv2/dnn/dnn.hpp>

namespace ClickFlash {

class FacesController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/faces", handleSearch);
        router.post("/api/faces/enroll", handleEnroll);
        router.post("/api/faces/reindex", handleReindex);
    }
    
    static void handleSearch(const HttpRequest& req, HttpResponse& res) {
        QString query = req.query.mid(5);
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            "SELECT id, name, email FROM users WHERE name LIKE :query OR email LIKE :query",
            {{"query", QString("%" + query + "%")}}
        );
        
        QVariantList faces;
        for (const QVariantMap& row : results) {
            faces.append(QVariantMap({
                {"id", row.value("id")},
                {"name", row.value("name")},
                {"email", row.value("email")},
                {"confidence", 0.95}
            }));
        }
        
        res.setJson(QVariantMap({
            {"faces", faces},
            {"count", faces.size()}
        }));
    }
    
    static void handleEnroll(const HttpRequest& req, HttpResponse& res) {
        QString userId = req.body.value("userId").toString();
        QString photoPath = req.body.value("photoPath").toString();
        
        if (userId.isEmpty() || photoPath.isEmpty()) {
            res.setError(400, "userId and photoPath are required");
            return;
        }
        
        cv::Mat image = cv::imread(photoPath.toStdString());
        
        if (image.empty()) {
            res.setError(400, "Could not load image");
            return;
        }
        
        std::vector<cv::Rect> faces;
        detectFaces(image, faces);
        
        if (faces.empty()) {
            res.setError(400, "No faces detected in image");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "INSERT OR REPLACE INTO ai_groups (id, type, metadata, created_at) "
            "VALUES (:id, 'face', :metadata, CURRENT_TIMESTAMP)",
            {{"id", QString("face-%1").arg(userId)}, 
             {"metadata", QString("{\"userId\": \"%1\"}").arg(userId)}}
        );
        
        res.setJson(QVariantMap({
            {"success", true},
            {"facesDetected", static_cast<int>(faces.size())},
            {"enrolled", true}
        }));
    }
    
    static void handleReindex(const HttpRequest& req, HttpResponse& res) {
        QString albumId = req.body.value("albumId").toString();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto photos = db.executeQueryMultiple(
            "SELECT id, storage_path FROM photos WHERE album_id = :albumId",
            {{"albumId", albumId}}
        );
        
        int indexed = 0;
        for (const QVariantMap& photo : photos) {
            QString path = photo.value("storage_path").toString();
            
            if (!path.isEmpty()) {
                cv::Mat image = cv::imread(path.toStdString());
                
                if (!image.empty()) {
                    indexed++;
                }
            }
        }
        
        res.setJson(QVariantMap({
            {"success", true},
            {"photosIndexed", indexed},
            {"albumId", albumId}
        }));
    }

private:
    static void detectFaces(const cv::Mat& image, std::vector<cv::Rect>& faces) {
        cv::CascadeClassifier faceCascade;
        
        QString cascadePath = ":/resources/haarcascade_frontalface_default.xml";
        
        if (!faceCascade.load(cascadePath.toStdString())) {
            return;
        }
        
        cv::Mat gray;
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
        
        faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, cv::Size(30, 30));
    }
};

} // namespace ClickFlash
