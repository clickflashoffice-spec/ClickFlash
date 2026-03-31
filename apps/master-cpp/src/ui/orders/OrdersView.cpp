#include "ui/orders/OrdersView.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include <QVBoxLayout>
#include <QLabel>

namespace ClickFlash {

OrdersView::OrdersView(QWidget* parent)
    : View(parent)
{
    setupHeader("Orders", true);
    
    m_ordersList = new QWidget(this);
    m_ordersList->setStyleSheet(R"(
        QWidget {
            background-color: #16213e;
            border-radius: 8px;
            padding: 16px;
        }
    )");
    
    QVBoxLayout* layout = new QVBoxLayout(m_ordersList);
    
    QLabel* placeholder = new QLabel("No orders yet", m_ordersList);
    placeholder->setAlignment(Qt::AlignCenter);
    placeholder->setStyleSheet("color: #a0a0a0; font-size: 16px; padding: 40px;");
    layout->addWidget(placeholder);
    
    addSection("", m_ordersList);
    
    refresh();
}

OrdersView::~OrdersView() {}

void OrdersView::refresh() {
    loadOrders();
}

void OrdersView::loadOrders() {
    try {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto orders = db.executeQueryMultiple(
            "SELECT id, customer_name, status, total, created_at FROM orders ORDER BY created_at DESC"
        );
        
        CF_DEBUG("Loaded {} orders", orders.size());
        
    } catch (const std::exception& e) {
        CF_ERROR("Failed to load orders: {}", e.what());
    }
}

} // namespace ClickFlash
