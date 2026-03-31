#include "ui/dashboard/DashboardView.h"
#include "ui/common/StatCard.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

namespace ClickFlash {

DashboardView::DashboardView(QWidget* parent)
    : View(parent)
{
    setStyleSheet(R"(
        DashboardView {
            background-color: #1a1a2e;
        }
    )");
    
    setupHeader("Dashboard");
    
    QWidget* statsContainer = new QWidget(this);
    QHBoxLayout* statsLayout = new QHBoxLayout(statsContainer);
    statsLayout->setSpacing(16);
    
    m_statCards.append(new StatCard("Revenue", "$0", "📊", statsContainer));
    m_statCards.append(new StatCard("Orders", "0", "📦", statsContainer));
    m_statCards.append(new StatCard("Albums", "0", "📁", statsContainer));
    m_statCards.append(new StatCard("Photos", "0", "🖼️", statsContainer));
    
    for (StatCard* card : m_statCards) {
        statsLayout->addWidget(card);
    }
    
    statsLayout->addStretch();
    
    addSection("Statistics", statsContainer);
    
    m_chartWidget = new QWidget(this);
    m_chartWidget->setMinimumHeight(300);
    m_chartWidget->setStyleSheet(R"(
        QWidget {
            background-color: #16213e;
            border-radius: 8px;
            padding: 16px;
        }
    )");
    QLabel* chartPlaceholder = new QLabel("Revenue Chart - Coming Soon", m_chartWidget);
    chartPlaceholder->setAlignment(Qt::AlignCenter);
    chartPlaceholder->setStyleSheet("color: #a0a0a0; font-size: 16px;");
    chartPlaceholder->setFixedSize(600, 250);
    
    addSection("Revenue Over Time", m_chartWidget);
    
    m_recentOrdersWidget = new QWidget(this);
    m_recentOrdersWidget->setStyleSheet(R"(
        QWidget {
            background-color: #16213e;
            border-radius: 8px;
            padding: 16px;
        }
    )");
    
    QVBoxLayout* ordersLayout = new QVBoxLayout(m_recentOrdersWidget);
    QLabel* ordersTitle = new QLabel("Recent Orders", m_recentOrdersWidget);
    ordersTitle->setStyleSheet("color: #ffffff; font-size: 18px; font-weight: bold;");
    ordersLayout->addWidget(ordersTitle);
    
    QLabel* noOrdersLabel = new QLabel("No recent orders", m_recentOrdersWidget);
    noOrdersLabel->setStyleSheet("color: #a0a0a0; padding: 20px;");
    ordersLayout->addWidget(noOrdersLabel);
    
    addSection("Recent Orders", m_recentOrdersWidget);
    
    refresh();
}

DashboardView::~DashboardView() {}

void DashboardView::onNavigateTo() {
    refresh();
}

void DashboardView::refresh() {
    loadDashboardData();
}

void DashboardView::loadDashboardData() {
    try {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto revenueResult = db.executeQuery(
            "SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status != 'cancelled'"
        );
        
        auto ordersResult = db.executeQuery(
            "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE('now')"
        );
        
        auto albumsResult = db.executeQuery(
            "SELECT COUNT(*) as count FROM albums"
        );
        
        auto photosResult = db.executeQuery(
            "SELECT COUNT(*) as count FROM photos"
        );
        
        if (!revenueResult.isEmpty()) {
            double revenue = revenueResult.value("revenue").toDouble();
            m_statCards[0]->setValue(QString("$%1").arg(revenue, 0, 'f', 2));
        }
        
        if (!ordersResult.isEmpty()) {
            int count = ordersResult.value("count").toInt();
            m_statCards[1]->setValue(QString::number(count));
        }
        
        if (!albumsResult.isEmpty()) {
            int count = albumsResult.value("count").toInt();
            m_statCards[2]->setValue(QString::number(count));
        }
        
        if (!photosResult.isEmpty()) {
            int count = photosResult.value("count").toInt();
            m_statCards[3]->setValue(QString::number(count));
        }
        
        CF_DEBUG("Dashboard data loaded");
        
    } catch (const std::exception& e) {
        CF_ERROR("Failed to load dashboard data: {}", e.what());
    }
}

} // namespace ClickFlash
