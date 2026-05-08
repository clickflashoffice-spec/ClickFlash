#include "ui/orders/OrdersBoard.h"
#include "database/DatabaseManager.h"
#include "services/OrderService.h"
#include "core/Logger.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QMessageBox>

namespace ClickFlash {

OrdersBoard::OrdersBoard(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    // Toolbar
    QWidget* toolbar = new QWidget(this);
    QHBoxLayout* toolbarLayout = new QHBoxLayout(toolbar);
    
    m_statusFilter = new QComboBox(this);
    m_statusFilter->addItems({"All", "pending", "processing", "completed", "cancelled"});
    
    m_searchBox = new QLineEdit(this);
    m_searchBox->setPlaceholderText("Search orders...");
    
    m_refreshBtn = new QPushButton("Refresh", this);
    m_createBtn = new QPushButton("New Order", this);
    
    connect(m_statusFilter, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &OrdersBoard::filterStatusChanged);
    connect(m_refreshBtn, &QPushButton::clicked, this, &OrdersBoard::refreshOrders);
    connect(m_createBtn, &QPushButton::clicked, this, &OrdersBoard::createOrder);
    
    toolbarLayout->addWidget(new QLabel("Status:", this));
    toolbarLayout->addWidget(m_statusFilter);
    toolbarLayout->addWidget(m_searchBox);
    toolbarLayout->addStretch();
    toolbarLayout->addWidget(m_refreshBtn);
    toolbarLayout->addWidget(m_createBtn);
    
    mainLayout->addWidget(toolbar);
    
    // Orders table
    m_ordersTable = new QTableWidget(this);
    m_ordersTable->setColumnCount(7);
    m_ordersTable->setHorizontalHeaderLabels({"ID", "Customer", "Album", "Total", "Status", "Date", "Actions"});
    m_ordersTable->horizontalHeader()->setStretchLastSection(true);
    m_ordersTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_ordersTable->setSelectionMode(QAbstractItemView::SingleSelection);
    m_ordersTable->setEditTriggers(QAbstractItemView::NoEditTriggers);
    
    connect(m_ordersTable, &QTableWidget::doubleClicked, this, &OrdersBoard::openOrderDetail);
    
    mainLayout->addWidget(m_ordersTable);
    
    loadOrders();
}

void OrdersBoard::loadOrders() {
    m_ordersTable->setRowCount(0);
    
    QString statusFilter = m_statusFilter->currentText();
    QString searchText = m_searchBox->text();
    
    QString query = R"(
        SELECT o.*, a.name as album_name, u.name as customer_name
        FROM orders o
        LEFT JOIN albums a ON o.album_id = a.id
        LEFT JOIN users u ON o.customer_name = u.name
        WHERE 1=1
    )";
    
    QVariantMap params;
    
    if (statusFilter != "All") {
        query += " AND o.status = :status";
        params["status"] = statusFilter;
    }
    
    if (!searchText.isEmpty()) {
        query += " AND (o.id LIKE :search OR o.customer_name LIKE :search OR a.name LIKE :search)";
        params["search"] = "%" + searchText + "%";
    }
    
    query += " ORDER BY o.created_at DESC";
    
    auto orders = DatabaseManager::instance().executeQueryMultiple(query, params);
    
    for (const auto& order : orders) {
        int row = m_ordersTable->rowCount();
        m_ordersTable->insertRow(row);
        
        m_ordersTable->setItem(row, 0, new QTableWidgetItem(order.value("id").toString().left(8)));
        m_ordersTable->setItem(row, 1, new QTableWidgetItem(order.value("customer_name").toString()));
        m_ordersTable->setItem(row, 2, new QTableWidgetItem(order.value("album_name").toString()));
        m_ordersTable->setItem(row, 3, new QTableWidgetItem(QString("$%1").arg(order.value("total").toDouble(), 0, 'f', 2)));
        
        QString status = order.value("status").toString();
        m_ordersTable->setItem(row, 4, new QTableWidgetItem(status));
        
        m_ordersTable->setItem(row, 5, new QTableWidgetItem(order.value("created_at").toString()));
        
        QPushButton* viewBtn = new QPushButton("View");
        m_ordersTable->setCellWidget(row, 6, viewBtn);
        
        connect(viewBtn, &QPushButton::clicked, this, [this, row]() {
            m_ordersTable->selectRow(row);
            openOrderDetail();
        });
    }
    
    CF_DEBUG("Loaded {} orders", orders.size());
}

void OrdersBoard::refreshOrders() {
    loadOrders();
}

void OrdersBoard::filterStatusChanged() {
    loadOrders();
}

void OrdersBoard::searchOrders() {
    loadOrders();
}

void OrdersBoard::openOrderDetail() {
    int row = m_ordersTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Select an order to view.");
        return;
    }
    
    QString orderId = m_ordersTable->item(row, 0)->text();
    CF_INFO("Opening order detail: {}", orderId.toStdString());
    
    // Would open OrderDetail widget here
    QMessageBox::information(this, "Order Detail", "Order: " + orderId);
}

void OrdersBoard::createOrder() {
    CF_INFO("Creating new order");
    // Would open order creation dialog
    QMessageBox::information(this, "New Order", "Order creation dialog would open here.");
}

} // namespace ClickFlash