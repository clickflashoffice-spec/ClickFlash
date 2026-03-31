#pragma once

#include "ui/View.h"
#include <QVector>
#include <QMap>

namespace ClickFlash {

class StatCard;
class QGridLayout;

class DashboardView : public View {
    Q_OBJECT

public:
    explicit DashboardView(QWidget* parent = nullptr);
    ~DashboardView();

    void refresh() override;

public slots:
    void onNavigateTo() override;

private slots:
    void loadDashboardData();

private:
    void setupStatsCards();
    void setupCharts();
    void setupRecentOrders();

    QVector<StatCard*> m_statCards;
    QWidget* m_chartWidget;
    QWidget* m_recentOrdersWidget;
};

} // namespace ClickFlash
