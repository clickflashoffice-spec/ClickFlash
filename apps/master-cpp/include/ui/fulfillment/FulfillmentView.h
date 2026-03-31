#pragma once

#include "ui/View.h"
#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QTableWidget>

namespace ClickFlash {

class FulfillmentView : public View {
    Q_OBJECT

public:
    explicit FulfillmentView(QWidget* parent = nullptr);
    ~FulfillmentView();

    void refresh() override;

private slots:
    void onOrderSelected(int row, int column);
    void onStatusChange(const QString& orderId, const QString& status);
    void onPrintSlip(const QString& orderId);
    void onPrintReceipt(const QString& orderId);

private:
    void loadOrders();
    void setupOrderBoard();
    void updateOrderStatus(const QString& orderId, const QString& status);

    QTableWidget* m_ordersTable;
    QLabel* m_statusLabel;
    QVector<QString> m_orderIds;
};

} // namespace ClickFlash