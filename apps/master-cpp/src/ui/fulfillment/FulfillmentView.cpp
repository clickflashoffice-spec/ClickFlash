#include "ui/fulfillment/FulfillmentView.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

namespace ClickFlash {

FulfillmentView::FulfillmentView(QWidget* parent)
    : View(parent)
{
    setupHeader("Fulfillment", true);
    
    QWidget* boardContainer = new QWidget(this);
    boardContainer->setStyleSheet("background-color: transparent;");
    
    QVBoxLayout* boardLayout = new QVBoxLayout(boardContainer);
    boardLayout->setContentsMargins(16, 16, 16, 16);
    boardLayout->setSpacing(16);
    
    m_statusLabel = new QLabel("Pending Orders", boardContainer);
    m_statusLabel->setStyleSheet("color: #ffffff; font-size: 20px; font-weight: bold;");
    boardLayout->addWidget(m_statusLabel);
    
    m_ordersTable = new QTableWidget(0, 6, boardContainer);
    m_ordersTable->setStyleSheet(R"(
        QTableWidget {
            background-color: #16213e;
            color: #e0e0e0;
            border: none;
            border-radius: 8px;
        }
        QTableWidget::item {
            padding: 12px;
            border-bottom: 1px solid #1a2744;
        }
        QTableWidget::item:selected {
            background-color: #0f3460;
        }
        QHeaderView::section {
            background-color: #1a2744;
            color: #a0a0a0;
            padding: 12px;
            border: none;
            font-weight: bold;
        }
    )");
    m_ordersTable->setHorizontalHeaderLabels({"Order #", "Customer", "Items", "Total", "Status", "Actions"});
    m_ordersTable->horizontalHeader()->setStretchLastSection(true);
    m_ordersTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_ordersTable->setShowGrid(false);
    m_ordersTable->setEditTriggers(QAbstractItemView::NoEditTriggers);
    
    boardLayout->addWidget(m_ordersTable);
    
    addSection("", boardContainer);
    refresh();
}

FulfillmentView::~FulfillmentView() {}

void FulfillmentView::refresh() {
    loadOrders();
}

void FulfillmentView::loadOrders() {
    try {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto orders = db.executeQueryMultiple(
            "SELECT id, orderNumber, clientName, items, total, status, created_at "
            "FROM orders WHERE status IN ('Pending', 'Processing', 'Completed') "
            "ORDER BY created_at DESC LIMIT 50"
        );
        
        m_ordersTable->setRowCount(orders.size());
        m_orderIds.clear();
        
        for (int i = 0; i < orders.size(); ++i) {
            const QVariantMap& order = orders[i];
            m_orderIds.append(order.value("id").toString());
            
            m_ordersTable->setItem(i, 0, new QTableWidgetItem(order.value("orderNumber").toString()));
            m_ordersTable->setItem(i, 1, new QTableWidgetItem(order.value("clientName").toString()));
            m_ordersTable->setItem(i, 2, new QTableWidgetItem("View Items"));
            m_ordersTable->setItem(i, 3, new QTableWidgetItem(QString("$%1").arg(order.value("total").toDouble(), 0, 'f', 2)));
            m_ordersTable->setItem(i, 4, new QTableWidgetItem(order.value("status").toString()));
            
            QWidget* actionsWidget = new QWidget();
            QHBoxLayout* actionsLayout = new QHBoxLayout(actionsWidget);
            actionsLayout->setContentsMargins(4, 4, 4, 4);
            
            QPushButton* printBtn = new QPushButton("Print", actionsWidget);
            printBtn->setStyleSheet(R"(
                QPushButton {
                    background-color: #0f3460;
                    color: #ffffff;
                    padding: 4px 12px;
                    border: none;
                    border-radius: 4px;
                }
                QPushButton:hover {
                    background-color: #16213e;
                }
            )");
            actionsLayout->addWidget(printBtn);
            actionsLayout->addStretch();
            
            m_ordersTable->setCellWidget(i, 5, actionsWidget);
            
            for (int col = 0; col < 5; ++col) {
                m_ordersTable->item(i, col)->setTextAlignment(Qt::AlignCenter);
            }
        }
        
        CF_DEBUG("Loaded {} orders for fulfillment", orders.size());
        
    } catch (const std::exception& e) {
        CF_ERROR("Failed to load orders: {}", e.what());
    }
}

void FulfillmentView::onOrderSelected(int row, int column) {
    Q_UNUSED(column);
    if (row >= 0 && row < m_orderIds.size()) {
        QString orderId = m_orderIds[row];
        CF_DEBUG("Order selected: {}", orderId.toStdString());
    }
}

void FulfillmentView::onStatusChange(const QString& orderId, const QString& status) {
    updateOrderStatus(orderId, status);
}

void FulfillmentView::onPrintSlip(const QString& orderId) {
    CF_DEBUG("Print slip for order: {}", orderId.toStdString());
}

void FulfillmentView::onPrintReceipt(const QString& orderId) {
    CF_DEBUG("Print receipt for order: {}", orderId.toStdString());
}

void FulfillmentView::setupOrderBoard() {
}

void FulfillmentView::updateOrderStatus(const QString& orderId, const QString& status) {
    try {
        DatabaseManager& db = DatabaseManager::instance();
        db.execute(
            "UPDATE orders SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
            {{"status", status}, {"id", orderId}}
        );
        CF_INFO("Order {} status updated to {}", orderId.toStdString(), status.toStdString());
        refresh();
    } catch (const std::exception& e) {
        CF_ERROR("Failed to update order status: {}", e.what());
    }
}

} // namespace ClickFlash