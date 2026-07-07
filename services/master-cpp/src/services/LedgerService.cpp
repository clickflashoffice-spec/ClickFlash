#include "services/LedgerService.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

#include <QUuid>

namespace ClickFlash {

QVariantMap LedgerService::getLedgerEntry(const QString& id) {
    return DatabaseManager::instance().executeQuery(
        "SELECT * FROM photographer_ledger WHERE id = :id",
        {{"id", id}}
    );
}

QList<QVariantMap> LedgerService::getLedgerEntries(const QString& photographerId, int limit) {
    return DatabaseManager::instance().executeQueryMultiple(
        R"(
            SELECT * FROM photographer_ledger 
            WHERE photographer_id = :photographer_id
            ORDER BY created_at DESC
            LIMIT :limit
        )",
        {{"photographer_id", photographerId}, {"limit", limit}}
    );
}

QVariantMap LedgerService::addEntry(const QVariantMap& data) {
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO photographer_ledger (id, photographer_id, order_id, amount, type, description, created_at)
            VALUES (:id, :photographer_id, :order_id, :amount, :type, :description, CURRENT_TIMESTAMP)
        )",
        {
            {"id", id},
            {"photographer_id", data.value("photographer_id")},
            {"order_id", data.value("order_id")},
            {"amount", data.value("amount")},
            {"type", data.value("type")},
            {"description", data.value("description")}
        }
    );
    
    if (success) {
        emit entryAdded(id);
        
        QVariantMap result;
        result["id"] = id;
        result["success"] = true;
        return result;
    }
    
    return QVariantMap{{"success", false}};
}

bool LedgerService::updateEntry(const QString& id, const QVariantMap& data) {
    QStringList sets;
    QVariantMap params;
    
    for (auto it = data.constBegin(); it != data.constEnd(); ++it) {
        sets.append(it.key() + " = :" + it.key());
        params[it.key()] = it.value();
    }
    
    if (sets.isEmpty()) return false;
    
    params["id"] = id;
    
    return DatabaseManager::instance().execute(
        "UPDATE photographer_ledger SET " + sets.join(", ") + " WHERE id = :id",
        params
    );
}

QList<QVariantMap> LedgerService::getEarnings(const QString& photographerId, const QString& startDate, const QString& endDate) {
    QString sql = R"(
        SELECT * FROM photographer_ledger 
        WHERE photographer_id = :photographer_id AND type = 'earning'
    )";
    QVariantMap params{{"photographer_id", photographerId}};
    
    if (!startDate.isEmpty()) {
        sql += " AND created_at >= :start_date";
        params["start_date"] = startDate;
    }
    
    if (!endDate.isEmpty()) {
        sql += " AND created_at <= :end_date";
        params["end_date"] = endDate;
    }
    
    sql += " ORDER BY created_at DESC";
    
    return DatabaseManager::instance().executeQueryMultiple(sql, params);
}

QList<QVariantMap> LedgerService::getExpenses(const QString& photographerId, const QString& startDate, const QString& endDate) {
    QString sql = R"(
        SELECT * FROM photographer_ledger 
        WHERE photographer_id = :photographer_id AND type = 'expense'
    )";
    QVariantMap params{{"photographer_id", photographerId}};
    
    if (!startDate.isEmpty()) {
        sql += " AND created_at >= :start_date";
        params["start_date"] = startDate;
    }
    
    if (!endDate.isEmpty()) {
        sql += " AND created_at <= :end_date";
        params["end_date"] = endDate;
    }
    
    sql += " ORDER BY created_at DESC";
    
    return DatabaseManager::instance().executeQueryMultiple(sql, params);
}

double LedgerService::getTotalEarnings(const QString& photographerId) {
    auto result = DatabaseManager::instance().executeQuery(
        R"(
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM photographer_ledger 
            WHERE photographer_id = :photographer_id AND type = 'earning'
        )",
        {{"photographer_id", photographerId}}
    );
    
    return result.value("total").toDouble();
}

double LedgerService::getPendingPayout(const QString& photographerId) {
    auto result = DatabaseManager::instance().executeQuery(
        R"(
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM photographer_ledger 
            WHERE photographer_id = :photographer_id AND type = 'earning' AND status = 'pending'
        )",
        {{"photographer_id", photographerId}}
    );
    
    return result.value("total").toDouble();
}

bool LedgerService::processPayout(const QString& photographerId, double amount) {
    // Create a payout entry
    QVariantMap entry;
    entry["photographer_id"] = photographerId;
    entry["amount"] = -amount; // Negative for payout
    entry["type"] = "payout";
    entry["description"] = "Payout processed";
    
    auto result = addEntry(entry);
    
    if (result.value("success").toBool()) {
        emit payoutProcessed(photographerId, amount);
        return true;
    }
    
    return false;
}

QList<QVariantMap> LedgerService::getUnpaidOrders() {
    return DatabaseManager::instance().executeQueryMultiple(
        R"(
            SELECT o.*, u.name as photographer_name 
            FROM orders o
            LEFT JOIN albums a ON o.album_id = a.id
            LEFT JOIN users u ON a.photographer_id = u.id
            WHERE o.status = 'completed' AND o.paid = 0
            ORDER BY o.updated_at DESC
        )
    );
}

bool LedgerService::payOrder(const QString& orderId, const QString& photographerId, double amount) {
    // Create earning entry for photographer
    QVariantMap entry;
    entry["photographer_id"] = photographerId;
    entry["order_id"] = orderId;
    entry["amount"] = amount;
    entry["type"] = "earning";
    entry["description"] = "Order payment";
    
    bool success = addEntry(entry).value("success").toBool();
    
    if (success) {
        // Mark order as paid
        DatabaseManager::instance().execute(
            "UPDATE orders SET paid = 1 WHERE id = :id",
            {{"id", orderId}}
        );
    }
    
    return success;
}

} // namespace ClickFlash