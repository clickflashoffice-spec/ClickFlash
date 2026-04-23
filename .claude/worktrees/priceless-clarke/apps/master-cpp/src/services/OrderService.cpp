#include "services/OrderService.h"
#include "services/CollectionService.h"
#include "core/Logger.h"
#include <QUuid>
#include <QDateTime>

namespace ClickFlash {

QJsonArray OrderService::listOrders(const QJsonObject& filters) {
    return CollectionService::getOrders(filters);
}

QJsonObject OrderService::getOrder(const QString& id) {
    return CollectionService::get("orders", id);
}

QJsonObject OrderService::createOrder(const QJsonObject& orderData) {
    QJsonObject record = orderData;
    
    if (!record.contains("uuid")) {
        record["uuid"] = QUuid::createUuid().toString(QUuid::WithoutBraces);
    }
    
    if (!record.contains("status")) {
        record["status"] = "pending";
    }
    
    if (!record.contains("payment_status")) {
        record["payment_status"] = "unpaid";
    }
    
    if (!record.contains("fulfillment_status")) {
        record["fulfillment_status"] = "unfulfilled";
    }
    
    if (!record.contains("created_at")) {
        record["created_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    }
    
    if (!record.contains("updated_at")) {
        record["updated_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    }
    
    double subtotal = 0;
    double tax = 0;
    double total = 0;
    
    if (record.contains("items")) {
        QJsonArray items = record["items"].toArray();
        for (const QJsonValue& item : items) {
            double unitPrice = item.toObject().value("unit_price").toDouble();
            int quantity = item.toObject().value("quantity").toInt(1);
            subtotal += unitPrice * quantity;
        }
        tax = subtotal * 0.0;
        total = subtotal + tax;
    }
    
    record["subtotal"] = subtotal;
    record["tax"] = tax;
    record["total"] = total;
    
    return CollectionService::create("orders", record);
}

QJsonObject OrderService::updateOrder(const QString& id, const QJsonObject& orderData) {
    QJsonObject record = orderData;
    record["updated_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    
    return CollectionService::update("orders", id, record);
}

bool OrderService::deleteOrder(const QString& id) {
    return CollectionService::remove("orders", id);
}

QJsonObject OrderService::updateOrderStatus(const QString& id, const QString& status) {
    QJsonObject currentOrder = getOrder(id);
    if (currentOrder.isEmpty()) {
        return QJsonObject();
    }
    
    QString currentStatus = currentOrder.value("status").toString();
    
    if (!validateStatusTransition(currentStatus, status)) {
        CF_WARN("Invalid status transition from {} to {}", currentStatus.toStdString(), status.toStdString());
        return QJsonObject{{"error", "Invalid status transition"}};
    }
    
    QJsonObject update;
    update["status"] = status;
    update["updated_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    
    if (status == "completed") {
        update["fulfillment_status"] = "fulfilled";
    }
    
    return updateOrder(id, update);
}

QJsonArray OrderService::getOrderItems(const QString& orderId) {
    DatabaseManager& db = DatabaseManager::instance();
    
    auto results = db.executeQueryMultiple(
        "SELECT * FROM order_items WHERE order_id = :orderId ORDER BY created_at",
        {{"orderId", orderId}}
    );
    
    QJsonArray items;
    for (const auto& row : results) {
        QJsonObject item;
        for (auto it = row.begin(); it != row.end(); ++it) {
            item[it.key()] = QJsonValue::fromVariant(it.value());
        }
        items.append(item);
    }
    
    return items;
}

QJsonObject OrderService::addOrderItem(const QString& orderId, const QJsonObject& itemData) {
    QJsonObject record = itemData;
    
    if (!record.contains("uuid")) {
        record["uuid"] = QUuid::createUuid().toString(QUuid::WithoutBraces);
    }
    
    record["order_id"] = orderId;
    record["created_at"] = QDateTime::currentDateTime().toString(Qt::ISODate);
    
    double unitPrice = record.value("unit_price").toDouble();
    int quantity = record.value("quantity").toInt(1);
    record["total_price"] = unitPrice * quantity;
    
    return CollectionService::create("order_items", record);
}

bool OrderService::removeOrderItem(const QString& itemId) {
    return CollectionService::remove("order_items", itemId);
}

QString OrderService::calculateTotals(const QJsonArray& items) {
    double subtotal = 0;
    
    for (const QJsonValue& item : items) {
        QJsonObject obj = item.toObject();
        double unitPrice = obj.value("unit_price").toDouble();
        int quantity = obj.value("quantity").toInt(1);
        subtotal += unitPrice * quantity;
    }
    
    double tax = subtotal * 0.0;
    double total = subtotal + tax;
    
    return QString("{\"subtotal\": %1, \"tax\": %2, \"total\": %3}").arg(subtotal).arg(tax).arg(total);
}

bool OrderService::validateStatusTransition(const QString& currentStatus, const QString& newStatus) {
    static QMap<QString, QStringList> validTransitions = {
        {"pending", {"confirmed", "cancelled"}},
        {"confirmed", {"processing", "cancelled"}},
        {"processing", {"shipped", "cancelled"}},
        {"shipped", {"delivered", "returned"}},
        {"delivered", {"returned"}},
        {"cancelled", {}},
        {"returned", {}}
    };
    
    QStringList allowed = validTransitions.value(currentStatus, QStringList());
    return allowed.contains(newStatus);
}

} // namespace ClickFlash
