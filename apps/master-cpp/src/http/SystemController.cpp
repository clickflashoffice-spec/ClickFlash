#include "http/SystemController.h"
#include "core/Logger.h"
#include "core/Config.h"
#include "database/DatabaseManager.h"
#include <QJsonObject>
#include <QDateTime>

namespace ClickFlash {

SystemController::SystemController(QObject* parent)
    : QObject(parent)
{
}

void SystemController::handleHealth(const HttpRequest& request, HttpResponse& response) {
    Q_UNUSED(request);

    QJsonObject health;
    health["status"] = "ok";
    health["timestamp"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    health["uptime"] = QDateTime::currentDateTime().currentMSecsSinceEpoch();

    try {
        DatabaseManager& db = DatabaseManager::instance();
        auto result = db.executeQuery("SELECT 1");
        health["database"] = "connected";
    } catch (...) {
        health["database"] = "disconnected";
        health["status"] = "degraded";
    }

    response.setStatus(200);
    response.body = health;
}

void SystemController::handleInfo(const HttpRequest& request, HttpResponse& response) {
    Q_UNUSED(request);

    QJsonObject info;
    info["name"] = "ClickFlash Master";
    info["version"] = "1.0.0";
    info["port"] = Config::instance().getPort();
    info["databasePath"] = Config::instance().getDatabasePath();
    info["uptime"] = QDateTime::currentDateTime().currentMSecsSinceEpoch();
    info["machineId"] = QUuid::createUuid().toString(QUuid::WithoutBraces);

    response.setStatus(200);
    response.body = info;
}

void SystemController::handlePrinters(const HttpRequest& request, HttpResponse& response) {
    Q_UNUSED(request);

    QJsonArray printers;
    printers.append(QJsonObject{
        {"name", "Default Printer"},
        {"status", "ready"},
        {"isDefault", true}
    });

    response.setStatus(200);
    response.body = QJsonObject{{"printers", printers}};
}

void SystemController::handleSettings(const HttpRequest& request, HttpResponse& response) {
    Q_UNUSED(request);

    response.setStatus(200);
    response.body = Config::instance().getAllSettings();
}

void SystemController::handleUpdateSettings(const HttpRequest& request, HttpResponse& response) {
    Config& config = Config::instance();
    config.updateSettings(request.body);

    response.setStatus(200);
    response.body = QJsonObject{{"success", true}};
}

} // namespace ClickFlash
