#pragma once

#include <QJsonObject>
#include <QJsonArray>
#include <QString>

namespace ClickFlash {

class OrderService {
public:
    static QJsonArray listOrders(const QJsonObject& filters = QJsonObject());
    static QJsonObject getOrder(const QString& id);
    static QJsonObject createOrder(const QJsonObject& orderData);
    static QJsonObject updateOrder(const QString& id, const QJsonObject& orderData);
    static bool deleteOrder(const QString& id);
    static QJsonObject updateOrderStatus(const QString& id, const QString& status);
    static QJsonArray getOrderItems(const QString& orderId);
    static QJsonObject addOrderItem(const QString& orderId, const QJsonObject& itemData);
    static bool removeOrderItem(const QString& itemId);

    static QString calculateTotals(const QJsonArray& items);

private:
    static bool validateStatusTransition(const QString& currentStatus, const QString& newStatus);
};

} // namespace ClickFlash
