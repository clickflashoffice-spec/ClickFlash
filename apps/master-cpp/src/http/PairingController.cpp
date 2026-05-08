#include "http/PairingController.h"
#include "http/Router.h"
#include "http/Request.h"
#include "http/Response.h"
#include "core/Logger.h"
#include "core/Config.h"
#include "database/DatabaseManager.h"
#include "utils/LanSigning.h"

namespace ClickFlash {

PairingController::PairingController(QObject* parent)
    : Controller(parent)
{
}

void PairingController::registerRoutes(Router* router) {
    router->post("/api/pairing/initiate", [this](Request& req, Response& res) { initiatePairing(req, res); });
    router->post("/api/pairing/confirm", [this](Request& req, Response& res) { confirmPairing(req, res); });
    router->get("/api/pairing/devices", [this](Request& req, Response& res) { getPairedDevices(req, res); });
    router->delete("/api/pairing/{device_id}", [this](Request& req, Response& res) { unpairDevice(req, res); });
    router->get("/api/pairing/status", [this](Request& req, Response& res) { getPairingStatus(req, res); });
    router->post("/api/pairing/{device_id}/renew", [this](Request& req, Response& res) { renewPairing(req, res); });
    
    CF_INFO("PairingController routes registered");
}

void PairingController::initiatePairing(Request& request, Response& response) {
    QString deviceName = request.get("device_name");
    QString deviceType = request.get("device_type", "kiosk");
    
    if (deviceName.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"device_name required\"}");
        return;
    }
    
    // Generate pairing token and secret
    QString token = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString secret = LanSigning::generateSecret(32);
    
    // Store pending pairing request
    QString pairingId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QDateTime expires = QDateTime::currentDateTime().addSecs(300); // 5 minutes
    
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO pairing_requests (id, token, secret, device_name, device_type, expires_at, status)
            VALUES (:id, :token, :secret, :device_name, :device_type, :expires_at, 'pending')
        )",
        {
            {"id", pairingId},
            {"token", token},
            {"secret", secret},
            {"device_name", deviceName},
            {"device_type", deviceType},
            {"expires_at", expires.toString(Qt::ISODate)}
        }
    );
    
    if (success) {
        QJsonObject result;
        result["pairing_id"] = pairingId;
        result["token"] = token;
        result["secret"] = secret;
        result["expires_in"] = 300;
        
        response.setStatus(201);
        response.setJson(result);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to initiate pairing\"}");
    }
}

void PairingController::confirmPairing(Request& request, Response& response) {
    QString token = request.get("token");
    QString secret = request.get("secret");
    QString deviceId = request.get("device_id");
    
    if (token.isEmpty() || secret.isEmpty() || deviceId.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"token, secret, and device_id required\"}");
        return;
    }
    
    // Verify pairing request
    auto pending = DatabaseManager::instance().executeQuery(
        R"(
            SELECT * FROM pairing_requests 
            WHERE token = :token AND secret = :secret AND status = 'pending'
        )",
        {{"token", token}, {"secret", secret}}
    );
    
    if (pending.isEmpty()) {
        response.setStatus(401);
        response.setBody("{\"error\": \"Invalid or expired pairing token\"}");
        return;
    }
    
    // Check expiry
    QDateTime expires = QDateTime::fromString(pending.value("expires_at").toString(), Qt::ISODate);
    if (expires < QDateTime::currentDateTime()) {
        DatabaseManager::instance().execute(
            "UPDATE pairing_requests SET status = 'expired' WHERE token = :token",
            {{"token", token}}
        );
        response.setStatus(401);
        response.setBody("{\"error\": \"Pairing token expired\"}");
        return;
    }
    
    // Create kiosk entry
    QString kioskId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString authToken = LanSigning::generateSecret(64);
    
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO kiosks (id, name, pairing_token, pairing_secret, status, paired_at)
            VALUES (:id, :name, :pairing_token, :pairing_secret, 'paired', :paired_at)
        )",
        {
            {"id", kioskId},
            {"name", pending.value("device_name").toString()},
            {"pairing_token", authToken},
            {"pairing_secret", pending.value("secret").toString()},
            {"paired_at", QDateTime::currentDateTime().toString(Qt::ISODate)}
        }
    );
    
    // Mark pairing request as completed
    DatabaseManager::instance().execute(
        "UPDATE pairing_requests SET status = 'completed' WHERE token = :token",
        {{"token", token}}
    );
    
    if (success) {
        QJsonObject result;
        result["kiosk_id"] = kioskId;
        result["auth_token"] = authToken;
        result["device_name"] = pending.value("device_name").toString();
        result["status"] = "paired";
        
        response.setJson(result);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to complete pairing\"}");
    }
}

void PairingController::getPairedDevices(Request& request, Response& response) {
    auto kiosks = DatabaseManager::instance().executeQueryMultiple(
        "SELECT * FROM kiosks WHERE status = 'paired' ORDER BY paired_at DESC"
    );
    
    QJsonArray deviceArray;
    for (const auto& kiosk : kiosks) {
        QJsonObject device;
        device["id"] = kiosk.value("id").toString();
        device["name"] = kiosk.value("name").toString();
        device["status"] = kiosk.value("status").toString();
        device["paired_at"] = kiosk.value("paired_at").toString();
        device["last_seen"] = kiosk.value("last_seen").toString();
        deviceArray.append(device);
    }
    
    QJsonObject result;
    result["devices"] = deviceArray;
    result["count"] = deviceArray.size();
    
    response.setJson(result);
}

void PairingController::unpairDevice(Request& request, Response& response) {
    QString deviceId = request.pathParam("device_id");
    
    bool success = DatabaseManager::instance().execute(
        "UPDATE kiosks SET status = 'unpaired' WHERE id = :id",
        {{"id", deviceId}}
    );
    
    if (success) {
        response.setStatus(204);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to unpair device\"}");
    }
}

void PairingController::getPairingStatus(Request& request, Response& response) {
    QString deviceId = request.get("device_id");
    
    if (deviceId.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"device_id required\"}");
        return;
    }
    
    auto kiosk = DatabaseManager::instance().executeQuery(
        "SELECT * FROM kiosks WHERE id = :id",
        {{"id", deviceId}}
    );
    
    if (kiosk.isEmpty()) {
        response.setStatus(404);
        response.setBody("{\"error\": \"Device not found\"}");
        return;
    }
    
    QJsonObject result;
    result["device_id"] = kiosk.value("id").toString();
    result["name"] = kiosk.value("name").toString();
    result["status"] = kiosk.value("status").toString();
    result["last_seen"] = kiosk.value("last_seen").toString();
    
    response.setJson(result);
}

void PairingController::renewPairing(Request& request, Response& response) {
    QString deviceId = request.pathParam("device_id");
    QString authToken = request.get("auth_token");
    
    if (authToken.isEmpty()) {
        response.setStatus(400);
        response.setBody("{\"error\": \"auth_token required\"}");
        return;
    }
    
    // Verify device and token
    auto kiosk = DatabaseManager::instance().executeQuery(
        "SELECT * FROM kiosks WHERE id = :id AND pairing_token = :token",
        {{"id", deviceId}, {"token", authToken}}
    );
    
    if (kiosk.isEmpty()) {
        response.setStatus(401);
        response.setBody("{\"error\": \"Invalid device or token\"}");
        return;
    }
    
    // Generate new token
    QString newToken = LanSigning::generateSecret(64);
    
    bool success = DatabaseManager::instance().execute(
        "UPDATE kiosks SET pairing_token = :token, last_seen = :last_seen WHERE id = :id",
        {
            {"token", newToken},
            {"last_seen", QDateTime::currentDateTime().toString(Qt::ISODate)},
            {"id", deviceId}
        }
    );
    
    if (success) {
        QJsonObject result;
        result["auth_token"] = newToken;
        result["renewed_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
        
        response.setJson(result);
    } else {
        response.setStatus(500);
        response.setBody("{\"error\": \"Failed to renew pairing\"}");
    }
}

} // namespace ClickFlash