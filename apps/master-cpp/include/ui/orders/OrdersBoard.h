#pragma once

#include "ui/View.h"
#include <QWidget>
#include <QTableWidget>
#include <QPushButton>
#include <QComboBox>
#include <QLineEdit>

namespace ClickFlash {

class OrdersBoard : public QWidget {
    Q_OBJECT

public:
    explicit OrdersBoard(QWidget* parent = nullptr);

private slots:
    void refreshOrders();
    void filterStatusChanged();
    void searchOrders();
    void openOrderDetail();
    void createOrder();

private:
    void loadOrders();
    
    QTableWidget* m_ordersTable;
    QComboBox* m_statusFilter;
    QLineEdit* m_searchBox;
    QPushButton* m_refreshBtn;
    QPushButton* m_createBtn;
};

} // namespace ClickFlash