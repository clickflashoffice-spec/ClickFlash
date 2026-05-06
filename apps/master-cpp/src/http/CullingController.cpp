#include "http/CullingController.h"
#include "http/Router.h"
#include "http/Request.h"
#include "http/Response.h"
#include "core/Logger.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

CullingController::CullingController(QObject* parent)
    : Controller(parent)
{
}

void CullingController::registerRoutes(Router* router) {
    router->post("/api/culling/start", [this](Request& req, Response& res) { startCullingSession(req, res); });
    router->get("/api/culling/{session_id}", [this](Request& req, Response& res) { getCullingSession(req, res); });
    router->post("/api/culling/{session_id}/submit", [this](Request& req, Response& res) { submitCulling(req, res); });
    router->get("/api/culling/{session_id}/photos", [this](Request& req, Response& res) { getCulledPhotos(req, res); });
    router->post("/api/culling/{session_id}/auto", [this](Request& req, Response& res) { autoCull(req, res); });
    
    CF_INFO("CullingController routes registered");
}

void CullingController::startCullingSession(Request& request, Response& response) {
    QString albumId = request.get("album_id");
    QString photographerId = request.get("photographer_id");
    
    if (albumId.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"album_id required\"}");
        return;
    }
    
    QString sessionId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    QDateTime now = QDateTime::currentDateTime();
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO culling_sessions (id, album_id, photographer_id, status, started_at)
            VALUES (:id, :album_id, :photographer_id, 'in_progress', :started_at)
        )",
        {
            {"id", sessionId},
            {"album_id", albumId},
            {"photographer_id", photographerId.isEmpty() ? QVariant() : photographerId},
            {"started_at", now.toString(Qt::ISODate)}
        }
    );
    
    if (success) {
        QJsonObject result;
        result["session_id"] = sessionId;
        result["album_id"] = albumId;
        result["status"] = "in_progress";
        
        response.setStatus(201);
        response.setJson(result);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to create culling session\"}");
    }
}

void CullingController::getCullingSession(Request& request, Response& response) {
    QString sessionId = request.pathParam("session_id");
    
    auto session = DatabaseManager::instance().executeQuery(
        "SELECT * FROM culling_sessions WHERE id = :id",
        {{"id", sessionId}}
    );
    
    if (session.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"Culling session not found\"}");
        return;
    }
    
    QJsonObject result;
    result["id"] = session.value("id").toString();
    result["album_id"] = session.value("album_id").toString();
    result["status"] = session.value("status").toString();
    result["total_photos"] = session.value("total_photos").toInt();
    result["curated_count"] = session.value("curated_count").toInt();
    result["rejected_count"] = session.value("rejected_count").toInt();
    result["started_at"] = session.value("started_at").toString();
    
    response.setJson(result);
}

void CullingController::submitCulling(Request& request, Response& response) {
    QString sessionId = request.pathParam("session_id");
    QJsonObject body = request.jsonBody();
    
    QString photoId = body.value("photo_id").toString();
    QString decision = body.value("decision").toString(); // "keep", "reject", "favorite"
    
    if (photoId.isEmpty() || decision.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"photo_id and decision required\"}");
        return;
    }
    
    // Update photo culling status
    QString cullingStatus;
    if (decision == "reject") {
        cullingStatus = "rejected";
    } else if (decision == "favorite") {
        cullingStatus = "favorite";
    } else {
        cullingStatus = "curated";
    }
    
    bool success = DatabaseManager::instance().execute(
        "UPDATE photos SET culling_status = :status WHERE id = :id",
        {
            {"status", cullingStatus},
            {"id", photoId}
        }
    );
    
    if (success) {
        // Update session counts
        DatabaseManager::instance().execute(
            R"(
                UPDATE culling_sessions 
                SET curated_count = curated_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            )",
            {{"id", sessionId}}
        );
        
        QJsonObject result;
        result["photo_id"] = photoId;
        result["decision"] = decision;
        result["status"] = "applied";
        
        response.setJson(result);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to apply culling decision\"}");
    }
}

void CullingController::getCulledPhotos(Request& request, Response& response) {
    QString sessionId = request.pathParam("session_id");
    QString filter = request.get("filter", "all"); // "all", "curated", "rejected", "favorite"
    
    QString query = "SELECT p.* FROM photos p ";
    query += "JOIN culling_sessions cs ON p.album_id = cs.album_id ";
    query += "WHERE cs.id = :session_id ";
    
    if (filter == "curated") {
        query += "AND p.culling_status = 'curated' ";
    } else if (filter == "rejected") {
        query += "AND p.culling_status = 'rejected' ";
    } else if (filter == "favorite") {
        query += "AND p.culling_status = 'favorite' ";
    }
    
    query += "ORDER BY p.created_at DESC";
    
    auto photos = DatabaseManager::instance().executeQueryMultiple(query, {{"session_id", sessionId}});
    
    QJsonArray photoArray;
    for (const auto& photo : photos) {
        QJsonObject p;
        p["id"] = photo.value("id").toString();
        p["url"] = photo.value("url").toString();
        p["thumbnail_url"] = photo.value("thumbnail_url").toString();
        p["culling_status"] = photo.value("culling_status").toString();
        photoArray.append(p);
    }
    
    QJsonObject result;
    result["photos"] = photoArray;
    result["filter"] = filter;
    
    response.setJson(result);
}

void CullingController::autoCull(Request& request, Response& response) {
    QString sessionId = request.pathParam("session_id");
    float qualityThreshold = request.get("quality_threshold", "0.5").toFloat();
    float similarityThreshold = request.get("similarity_threshold", "0.9").toFloat();
    
    // TODO: Implement auto-culling logic using MLWorker
    // - Detect blurry photos
    // - Detect duplicates/similar photos
    // - Apply quality scores
    
    QJsonObject result;
    result["session_id"] = sessionId;
    result["status"] = "processing";
    result["message"] = "Auto-culling initiated";
    
    response.setStatus(202);
    response.setJson(result);
}

} // namespace ClickFlash