#include "http/FacesController.h"
#include "http/Router.h"
#include "http/Request.h"
#include "http/Response.h"
#include "core/Logger.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

FacesController::FacesController(QObject* parent)
    : Controller(parent)
{
}

void FacesController::registerRoutes(Router* router) {
    router->get("/api/faces", [this](Request& req, Response& res) { getFaces(req, res); });
    router->get("/api/faces/{id}", [this](Request& req, Response& res) { getFace(req, res); });
    router->post("/api/faces/detect", [this](Request& req, Response& res) { detectFaces(req, res); });
    router->post("/api/faces/train", [this](Request& req, Response& res) { trainModel(req, res); });
    router->get("/api/faces/similar", [this](Request& req, Response& res) { getSimilar(req, res); });
    router->delete("/api/faces/{id}", [this](Request& req, Response& res) { deleteFace(req, res); });
    
    CF_INFO("FacesController routes registered");
}

void FacesController::detectFaces(Request& request, Response& response) {
    QString photoId = request.get("photo_id");
    
    if (photoId.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"photo_id required\"}");
        return;
    }
    
    // TODO: Integrate with MLWorker for actual face detection
    QJsonObject result;
    result["photo_id"] = photoId;
    result["faces"] = QJsonArray();
    result["status"] = "pending";
    
    response.setStatus(200);
    response.setJson(result);
}

void FacesController::getFaces(Request& request, Response& response) {
    int page = request.get("page", "1").toInt();
    int limit = request.get("limit", "50").toInt();
    QString albumId = request.get("album_id");
    
    QString query = "SELECT * FROM faces WHERE 1=1";
    if (!albumId.isEmpty()) {
        query += " AND album_id = :album_id";
    }
    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
    
    auto params = QVariantMap{
        {"limit", limit},
        {"offset", (page - 1) * limit}
    };
    if (!albumId.isEmpty()) {
        params["album_id"] = albumId;
    }
    
    auto results = DatabaseManager::instance().executeQueryMultiple(query, params);
    
    QJsonArray faces;
    for (const auto& row : results) {
        QJsonObject face;
        face["id"] = row.value("id").toString();
        face["photo_id"] = row.value("photo_id").toString();
        face["x"] = row.value("x").toDouble();
        face["y"] = row.value("y").toDouble();
        face["width"] = row.value("width").toDouble();
        face["height"] = row.value("height").toDouble();
        face["confidence"] = row.value("confidence").toDouble();
        faces.append(face);
    }
    
    QJsonObject result;
    result["faces"] = faces;
    result["page"] = page;
    result["total"] = faces.size();
    
    response.setJson(result);
}

void FacesController::getFace(Request& request, Response& response) {
    QString id = request.pathParam("id");
    
    auto row = DatabaseManager::instance().executeQuery(
        "SELECT * FROM faces WHERE id = :id",
        {{"id", id}}
    );
    
    if (row.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"Face not found\"}");
        return;
    }
    
    QJsonObject face;
    face["id"] = row.value("id").toString();
    face["photo_id"] = row.value("photo_id").toString();
    face["x"] = row.value("x").toDouble();
    face["y"] = row.value("y").toDouble();
    face["width"] = row.value("width").toDouble();
    face["height"] = row.value("height").toDouble();
    face["confidence"] = row.value("confidence").toDouble();
    face["person_id"] = row.value("person_id").toString();
    
    response.setJson(face);
}

void FacesController::deleteFace(Request& request, Response& response) {
    QString id = request.pathParam("id");
    
    bool success = DatabaseManager::instance().execute(
        "DELETE FROM faces WHERE id = :id",
        {{"id", id}}
    );
    
    if (success) {
        response.setStatus(204);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to delete face\"}");
    }
}

void FacesController::trainModel(Request& request, Response& response) {
    QString personId = request.get("person_id");
    
    if (personId.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"person_id required\"}");
        return;
    }
    
    // TODO: Trigger MLWorker for model training
    QJsonObject result;
    result["status"] = "training_started";
    result["person_id"] = personId;
    
    response.setStatus(202);
    response.setJson(result);
}

void FacesController::getSimilar(Request& request, Response& response) {
    QString faceId = request.get("face_id");
    float threshold = request.get("threshold", "0.7").toFloat();
    
    if (faceId.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"face_id required\"}");
        return;
    }
    
    // TODO: Implement similarity search using vector database
    QJsonArray similar;
    
    QJsonObject result;
    result["similar"] = similar;
    
    response.setJson(result);
}

} // namespace ClickFlash