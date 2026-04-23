#include "http/CollectionsController.h"
#include "services/CollectionService.h"
#include "core/Logger.h"

namespace ClickFlash {

CollectionsController::CollectionsController(QObject* parent)
    : QObject(parent)
{
}

void CollectionsController::handleList(const HttpRequest& request, HttpResponse& response) {
    QString collection = request.params.value("collection").toString();
    
    if (collection.isEmpty()) {
        response.setError(400, "Collection name is required");
        return;
    }

    QJsonObject filters;
    for (auto it = request.queryParams.begin(); it != request.queryParams.end(); ++it) {
        filters[it.key()] = it.value();
    }

    QJsonArray items = CollectionService::list(collection, filters);

    response.setStatus(200);
    response.body = QJsonObject{
        {"collection", collection},
        {"count", items.size()},
        {"items", items}
    };
}

void CollectionsController::handleGet(const HttpRequest& request, HttpResponse& response) {
    QString collection = request.params.value("collection").toString();
    QString id = request.params.value("id").toString();

    if (collection.isEmpty() || id.isEmpty()) {
        response.setError(400, "Collection and ID are required");
        return;
    }

    QJsonObject item = CollectionService::get(collection, id);

    if (item.isEmpty()) {
        response.setError(404, "Item not found");
        return;
    }

    response.setStatus(200);
    response.body = item;
}

void CollectionsController::handleCreate(const HttpRequest& request, HttpResponse& response) {
    QString collection = request.params.value("collection").toString();

    if (collection.isEmpty()) {
        response.setError(400, "Collection name is required");
        return;
    }

    QJsonObject item = CollectionService::create(collection, request.body);

    if (item.isEmpty()) {
        response.setError(500, "Failed to create item");
        return;
    }

    response.setStatus(201);
    response.body = item;
}

void CollectionsController::handleUpdate(const HttpRequest& request, HttpResponse& response) {
    QString collection = request.params.value("collection").toString();
    QString id = request.params.value("id").toString();

    if (collection.isEmpty() || id.isEmpty()) {
        response.setError(400, "Collection and ID are required");
        return;
    }

    QJsonObject item = CollectionService::update(collection, id, request.body);

    if (item.isEmpty()) {
        response.setError(500, "Failed to update item");
        return;
    }

    response.setStatus(200);
    response.body = item;
}

void CollectionsController::handleDelete(const HttpRequest& request, HttpResponse& response) {
    QString collection = request.params.value("collection").toString();
    QString id = request.params.value("id").toString();

    if (collection.isEmpty() || id.isEmpty()) {
        response.setError(400, "Collection and ID are required");
        return;
    }

    if (CollectionService::remove(collection, id)) {
        response.setStatus(204);
    } else {
        response.setError(500, "Failed to delete item");
    }
}

} // namespace ClickFlash
