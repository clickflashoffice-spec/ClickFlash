#include "http/OrdersController.h"
#include "services/OrderService.h"
#include "core/Logger.h"

namespace ClickFlash {

OrdersController::OrdersController(QObject* parent)
    : QObject(parent)
{
}

void OrdersController::handleList(const HttpRequest& request, HttpResponse& response) {
    QJsonObject filters;
    for (auto it = request.queryParams.begin(); it != request.queryParams.end(); ++it) {
        filters[it.key()] = it.value();
    }

    QJsonArray orders = OrderService::listOrders(filters);

    response.setStatus(200);
    response.body = QJsonObject{
        {"count", orders.size()},
        {"orders", orders}
    };
}

void OrdersController::handleGet(const HttpRequest& request, HttpResponse& response) {
    QString id = request.params.value("id").toString();

    if (id.isEmpty()) {
        response.setError(400, "Order ID is required");
        return;
    }

    QJsonObject order = OrderService::getOrder(id);

    if (order.isEmpty()) {
        response.setError(404, "Order not found");
        return;
    }

    response.setStatus(200);
    response.body = order;
}

void OrdersController::handleCreate(const HttpRequest& request, HttpResponse& response) {
    QJsonObject order = OrderService::createOrder(request.body);

    if (order.isEmpty()) {
        response.setError(500, "Failed to create order");
        return;
    }

    response.setStatus(201);
    response.body = order;
}

void OrdersController::handleUpdate(const HttpRequest& request, HttpResponse& response) {
    QString id = request.params.value("id").toString();

    if (id.isEmpty()) {
        response.setError(400, "Order ID is required");
        return;
    }

    QJsonObject order = OrderService::updateOrder(id, request.body);

    if (order.isEmpty()) {
        response.setError(500, "Failed to update order");
        return;
    }

    response.setStatus(200);
    response.body = order;
}

void OrdersController::handleDelete(const HttpRequest& request, HttpResponse& response) {
    QString id = request.params.value("id").toString();

    if (id.isEmpty()) {
        response.setError(400, "Order ID is required");
        return;
    }

    if (OrderService::deleteOrder(id)) {
        response.setStatus(204);
    } else {
        response.setError(500, "Failed to delete order");
    }
}

void OrdersController::handleUpdateStatus(const HttpRequest& request, HttpResponse& response) {
    QString id = request.params.value("id").toString();
    QString status = request.body.value("status").toString();

    if (id.isEmpty() || status.isEmpty()) {
        response.setError(400, "Order ID and status are required");
        return;
    }

    QJsonObject result = OrderService::updateOrderStatus(id, status);

    if (result.contains("error")) {
        response.setError(422, result.value("error").toString());
        return;
    }

    response.setStatus(200);
    response.body = result;
}

void OrdersController::handleGetItems(const HttpRequest& request, HttpResponse& response) {
    QString orderId = request.params.value("id").toString();

    if (orderId.isEmpty()) {
        response.setError(400, "Order ID is required");
        return;
    }

    QJsonArray items = OrderService::getOrderItems(orderId);

    response.setStatus(200);
    response.body = QJsonObject{
        {"orderId", orderId},
        {"items", items}
    };
}

void OrdersController::handleAddItem(const HttpRequest& request, HttpResponse& response) {
    QString orderId = request.body.value("order_id").toString();

    if (orderId.isEmpty()) {
        response.setError(400, "Order ID is required");
        return;
    }

    QJsonObject item = OrderService::addOrderItem(orderId, request.body);

    if (item.isEmpty()) {
        response.setError(500, "Failed to add item");
        return;
    }

    response.setStatus(201);
    response.body = item;
}

void OrdersController::handleRemoveItem(const HttpRequest& request, HttpResponse& response) {
    QString itemId = request.params.value("itemId").toString();

    if (itemId.isEmpty()) {
        response.setError(400, "Item ID is required");
        return;
    }

    if (OrderService::removeOrderItem(itemId)) {
        response.setStatus(204);
    } else {
        response.setError(500, "Failed to remove item");
    }
}

} // namespace ClickFlash
