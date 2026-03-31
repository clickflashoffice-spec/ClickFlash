#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include <QCryptographicHash>

namespace ClickFlash {

class PairingController {
public:
    static void registerRoutes(Router& router) {
        router.post("/api/pairing/generate", handleGenerateToken);
        router.post("/api/pairing/confirm", handleConfirmPairing);
        router.get("/api/pairing/status", handleStatus);
    }
    
    static void handleGenerateToken(const HttpRequest& req, HttpResponse& res) {
        QString kioskName = req.body.value("name").toString();
        
        if (kioskName.isEmpty()) {
            res.setError(400, "Kiosk name is required");
            return;
        }
        
        QString token = generateRandomToken(32);
        QString secret = generateRandomToken(64);
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString kioskId = QString("KIO-%1").arg(QDateTime::currentSecsSinceEpoch());
        
        db.execute(
            "INSERT INTO kiosks (id, name, pairing_token, pairing_secret, status) "
            "VALUES (:id, :name, :token, :secret, 'unpaired')",
            {{"id", kioskId}, {"name", kioskName}, {"token", token}, {"secret", secret}}
        );
        
        QVariantMap response;
        response["kioskId"] = kioskId;
        response["pairingToken"] = token;
        response["expiresIn"] = 300;
        
        res.setJson(response);
    }
    
    static void handleConfirmPairing(const HttpRequest& req, HttpResponse& res) {
        QString kioskId = req.body.value("kioskId").toString();
        QString token = req.body.value("token").toString();
        QString secret = req.body.value("secret").toString();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto kiosk = db.executeQuery(
            "SELECT * FROM kiosks WHERE id = :id AND pairing_token = :token AND pairing_secret = :secret",
            {{"id", kioskId}, {"token", token}, {"secret", secret}}
        );
        
        if (kiosk.isEmpty()) {
            res.setError(401, "Invalid pairing credentials");
            return;
        }
        
        db.execute(
            "UPDATE kiosks SET status = 'paired', paired_at = CURRENT_TIMESTAMP WHERE id = :id",
            {{"id", kioskId}}
        );
        
        res.setJson(QVariantMap({
            {"success", true},
            {"kioskId", kioskId},
            {"message", "Pairing confirmed"}
        }));
    }
    
    static void handleStatus(const HttpRequest& req, HttpResponse& res) {
        QString kioskId = req.params.value("id");
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto kiosk = db.executeQuery(
            "SELECT id, name, status, last_seen, paired_at FROM kiosks WHERE id = :id",
            {{"id", kioskId}}
        );
        
        if (kiosk.isEmpty()) {
            res.setError(404, "Kiosk not found");
            return;
        }
        
        db.execute(
            "UPDATE kiosks SET last_seen = CURRENT_TIMESTAMP WHERE id = :id",
            {{"id", kioskId}}
        );
        
        res.setJson(kiosk);
    }

private:
    static QString generateRandomToken(int length) {
        const QString chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        QString token;
        
        for (int i = 0; i < length; i++) {
            int index = QRandomGenerator::global()->bounded(chars.length());
            token.append(chars[index]);
        }
        
        return token;
    }
};

} // namespace ClickFlash
