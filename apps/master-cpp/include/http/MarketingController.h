#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class MarketingController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/marketing/campaigns", handleGetCampaigns);
        router.post("/api/marketing/campaigns", handleCreateCampaign);
        router.get("/api/marketing/campaigns/:id", handleGetCampaign);
        router.put("/api/marketing/campaigns/:id", handleUpdateCampaign);
        router.delete("/api/marketing/campaigns/:id", handleDeleteCampaign);
        router.post("/api/marketing/campaigns/:id/send", handleSendCampaign);
        router.get("/api/marketing/stats", handleStats);
    }
    
    static void handleGetCampaigns(const HttpRequest& req, HttpResponse& res) {
        Q_UNUSED(req);
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            "SELECT id, name, type, trigger_event, delay_minutes, subject_template, "
            "body_html, is_active, created_at FROM marketing_campaigns ORDER BY created_at DESC"
        );
        
        QVariantList campaigns;
        for (const QVariantMap& row : results) {
            campaigns.append(QVariantMap({
                {"id", row.value("id")},
                {"name", row.value("name")},
                {"type", row.value("type")},
                {"triggerEvent", row.value("trigger_event")},
                {"delayMinutes", row.value("delay_minutes").toInt()},
                {"subjectTemplate", row.value("subject_template")},
                {"bodyHtml", row.value("body_html")},
                {"isActive", row.value("is_active").toInt() == 1},
                {"createdAt", row.value("created_at")}
            }));
        }
        
        res.setJson(QVariantMap({
            {"campaigns", campaigns},
            {"count", campaigns.size()}
        }));
    }
    
    static void handleCreateCampaign(const HttpRequest& req, HttpResponse& res) {
        QString name = req.body.value("name").toString();
        QString type = req.body.value("type").toString();
        QString triggerEvent = req.body.value("triggerEvent").toString();
        int delayMinutes = req.body.value("delayMinutes", 60).toInt();
        QString subjectTemplate = req.body.value("subjectTemplate").toString();
        QString bodyHtml = req.body.value("bodyHtml").toString();
        
        if (name.isEmpty() || type.isEmpty()) {
            res.setError(400, "Name and type are required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
        
        db.execute(
            "INSERT INTO marketing_campaigns (id, name, type, trigger_event, delay_minutes, "
            "subject_template, body_html, status, created_at) "
            "VALUES (:id, :name, :type, :triggerEvent, :delayMinutes, :subjectTemplate, :bodyHtml, 'draft', CURRENT_TIMESTAMP)",
            {
                {"id", id},
                {"name", name},
                {"type", type},
                {"triggerEvent", triggerEvent},
                {"delayMinutes", delayMinutes},
                {"subjectTemplate", subjectTemplate},
                {"bodyHtml", bodyHtml}
            }
        );
        
        res.setStatus(201);
        res.setJson(QVariantMap({
            {"success", true},
            {"id", id},
            {"message", "Campaign created"}
        }));
    }
    
    static void handleGetCampaign(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        if (id.isEmpty()) {
            res.setError(400, "Campaign ID is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto result = db.executeQuery(
            "SELECT * FROM marketing_campaigns WHERE id = :id",
            {{"id", id}}
        );
        
        if (result.isEmpty()) {
            res.setError(404, "Campaign not found");
            return;
        }
        
        res.setJson(QVariantMap({
            {"id", result.value("id")},
            {"name", result.value("name")},
            {"type", result.value("type")},
            {"triggerEvent", result.value("trigger_event")},
            {"delayMinutes", result.value("delay_minutes").toInt()},
            {"subjectTemplate", result.value("subject_template")},
            {"bodyHtml", result.value("body_html")},
            {"isActive", result.value("is_active").toInt() == 1}
        }));
    }
    
    static void handleUpdateCampaign(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        if (id.isEmpty()) {
            res.setError(400, "Campaign ID is required");
            return;
        }
        
        QString name = req.body.value("name").toString();
        QString type = req.body.value("type").toString();
        QString subjectTemplate = req.body.value("subjectTemplate").toString();
        QString bodyHtml = req.body.value("bodyHtml").toString();
        bool isActive = req.body.value("isActive").toBool();
        
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "UPDATE marketing_campaigns SET name = :name, type = :type, subject_template = :subjectTemplate, "
            "body_html = :bodyHtml, is_active = :isActive, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
            {
                {"name", name},
                {"type", type},
                {"subjectTemplate", subjectTemplate},
                {"bodyHtml", bodyHtml},
                {"isActive", isActive ? 1 : 0},
                {"id", id}
            }
        );
        
        res.setJson(QVariantMap({
            {"success", true},
            {"message", "Campaign updated"}
        }));
    }
    
    static void handleDeleteCampaign(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        if (id.isEmpty()) {
            res.setError(400, "Campaign ID is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute("DELETE FROM marketing_campaigns WHERE id = :id", {{"id", id}});
        
        res.setJson(QVariantMap({
            {"success", true},
            {"message", "Campaign deleted"}
        }));
    }
    
    static void handleSendCampaign(const HttpRequest& req, HttpResponse& res) {
        QString id = req.params.value("id");
        
        if (id.isEmpty()) {
            res.setError(400, "Campaign ID is required");
            return;
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto campaign = db.executeQuery(
            "SELECT * FROM marketing_campaigns WHERE id = :id",
            {{"id", id}}
        );
        
        if (campaign.isEmpty()) {
            res.setError(404, "Campaign not found");
            return;
        }
        
        db.execute(
            "UPDATE marketing_campaigns SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = :id",
            {{"id", id}}
        );
        
        res.setJson(QVariantMap({
            {"success", true},
            {"sent", true},
            {"message", "Campaign queued for sending"}
        }));
    }
    
    static void handleStats(const HttpRequest& req, HttpResponse& res) {
        Q_UNUSED(req);
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto total = db.executeQuery("SELECT COUNT(*) as count FROM marketing_campaigns");
        auto active = db.executeQuery("SELECT COUNT(*) as count FROM marketing_campaigns WHERE is_active = 1");
        auto sent = db.executeQuery(
            "SELECT COUNT(*) as count FROM marketing_campaigns WHERE status = 'sent'"
        );
        
        res.setJson(QVariantMap({
            {"totalCampaigns", total.value("count").toInt()},
            {"activeCampaigns", active.value("count").toInt()},
            {"sentCampaigns", sent.value("count").toInt()}
        }));
    }
};

} // namespace ClickFlash