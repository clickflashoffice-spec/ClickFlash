#pragma once

#include "ui/View.h"

namespace ClickFlash {

class OrdersView : public View {
    Q_OBJECT

public:
    explicit OrdersView(QWidget* parent = nullptr);
    ~OrdersView();

    void refresh() override;

private slots:
    void loadOrders();

private:
    QWidget* m_ordersList;
};

} // namespace ClickFlash
