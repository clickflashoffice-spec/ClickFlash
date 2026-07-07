#pragma once

#include <QObject>
#include <QString>
#include <QList>
#include <QVariantMap>

namespace ClickFlash {

class LedgerService : public QObject {
    Q_OBJECT

public:
    static LedgerService& instance() {
        static LedgerService instance;
        return instance;
    }

    QVariantMap getLedgerEntry(const QString& id);
    QList<QVariantMap> getLedgerEntries(const QString& photographerId, int limit = 50);
    QVariantMap addEntry(const QVariantMap& data);
    bool updateEntry(const QString& id, const QVariantMap& data);
    
    QList<QVariantMap> getEarnings(const QString& photographerId, const QString& startDate = "", const QString& endDate = "");
    QList<QVariantMap> getExpenses(const QString& photographerId, const QString& startDate = "", const QString& endDate = "");
    
    double getTotalEarnings(const QString& photographerId);
    double getPendingPayout(const QString& photographerId);
    
    bool processPayout(const QString& photographerId, double amount);
    
    QList<QVariantMap> getUnpaidOrders();
    bool payOrder(const QString& orderId, const QString& photographerId, double amount);

signals:
    void entryAdded(const QString& id);
    void payoutProcessed(const QString& photographerId, double amount);

private:
    LedgerService(QObject* parent = nullptr) : QObject(parent) {}
    ~LedgerService() = default;
    
    LedgerService(const LedgerService&) = delete;
    LedgerService& operator=(const LedgerService&) = delete;
};

} // namespace ClickFlash