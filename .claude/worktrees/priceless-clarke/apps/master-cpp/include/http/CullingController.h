#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class CullingController {
public:
    static void registerRoutes(Router& router) {
        router.post("/api/culling/analyze", handleAnalyze);
        router.post("/api/culling/auto-approve", handleAutoApprove);
    }
    
    static void handleAnalyze(const HttpRequest& req, HttpResponse& res) {
        QString albumId = req.body.value("albumId").toString();
        
        if (albumId.isEmpty()) {
            res.setError(400, "albumId is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto photos = db.executeQueryMultiple(
            "SELECT id, storage_path FROM photos WHERE album_id = :albumId AND culling_status = 'pending'",
            {{"albumId", albumId}}
        );
        
        int analyzed = 0;
        int approved = 0;
        int rejected = 0;
        
        for (const QVariantMap& photo : photos) {
            QString photoId = photo.value("id").toString();
            
            double score = analyzePhotoQuality(photo.value("storage_path").toString());
            
            QString status = score > 0.7 ? "approved" : (score < 0.3 ? "rejected" : "pending");
            
            db.execute(
                "INSERT OR REPLACE INTO ai_scores (photo_id, score, status, created_at) "
                "VALUES (:id, :score, :status, CURRENT_TIMESTAMP)",
                {{"id", photoId}, {"score", QString::number(score, 'f', 3)}, {"status", status}}
            );
            
            db.execute(
                "UPDATE photos SET culling_status = :status WHERE id = :id",
                {{"status", status}, {"id", photoId}}
            );
            
            analyzed++;
            if (status == "approved") approved++;
            else if (status == "rejected") rejected++;
        }
        
        res.setJson(QVariantMap({
            {"success", true},
            {"analyzed", analyzed},
            {"approved", approved},
            {"rejected", rejected},
            {"pending", analyzed - approved - rejected}
        }));
    }
    
    static void handleAutoApprove(const HttpRequest& req, HttpResponse& res) {
        QString albumId = req.body.value("albumId").toString();
        double threshold = req.body.value("threshold", 0.8).toDouble();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            "SELECT photo_id FROM ai_scores WHERE score >= :threshold",
            {{"threshold", QString::number(threshold, 'f', 2)}}
        );
        
        int approved = 0;
        for (const QVariantMap& row : results) {
            QString photoId = row.value("photo_id").toString();
            
            db.execute(
                "UPDATE photos SET culling_status = 'approved' WHERE id = :id",
                {{"id", photoId}}
            );
            approved++;
        }
        
        res.setJson(QVariantMap({
            {"success", true},
            {"autoApproved", approved}
        }));
    }

private:
    static double analyzePhotoQuality(const QString& path) {
        return 0.5 + (QRandomGenerator::global()->bounded(50) / 100.0);
    }
};

} // namespace ClickFlash
