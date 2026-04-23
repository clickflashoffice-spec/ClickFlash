#include "http/SyncController.h"
#include "services/SyncService.h"
#include "core/Logger.h"

namespace ClickFlash {

SyncController::SyncController(QObject* parent)
    : QObject(parent)
{
}

void SyncController::handlePushMutation(const HttpRequest& request, HttpResponse& response) {
    QString kioskId = request.headers.value("x-kiosk-id").toString();

    if (kioskId.isEmpty()) {
        kioskId = "master";
    }

    QJsonObject result = SyncService::pushMutation(request.body, kioskId);

    if (result.contains("error")) {
        response.setError(400, result.value("error").toString());
        return;
    }

    response.setStatus(200);
    response.body = result;
}

void SyncController::handlePullChanges(const HttpRequest& request, HttpResponse& response) {
    QString kioskId = request.headers.value("x-kiosk-id").toString();

    if (kioskId.isEmpty()) {
        kioskId = "master";
    }

    QJsonObject result = SyncService::pullChanges(request.body, kioskId);

    response.setStatus(200);
    response.body = result;
}

void SyncController::handleGetStatus(const HttpRequest& request, HttpResponse& response) {
    Q_UNUSED(request);

    QJsonObject status = SyncService::getSyncStatus();

    response.setStatus(200);
    response.body = status;
}

void SyncController::handleResolveConflict(const HttpRequest& request, HttpResponse& response) {
    QString entityType = request.body.value("entity_type").toString();
    QString entityId = request.body.value("entity_id").toString();
    QJsonObject resolution = request.body.value("resolution").toObject();

    if (entityType.isEmpty() || entityId.isEmpty()) {
        response.setError(400, "Entity type and ID are required");
        return;
    }

    if (SyncService::resolveConflict(entityType, entityId, resolution)) {
        response.setStatus(200);
        response.body = QJsonObject{{"success", true}};
    } else {
        response.setError(500, "Failed to resolve conflict");
    }
}

} // namespace ClickFlash
