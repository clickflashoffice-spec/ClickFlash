#pragma once

#include "ui/View.h"

namespace ClickFlash {

class BookingsView : public View {
    Q_OBJECT

public:
    explicit BookingsView(QWidget* parent = nullptr);
    ~BookingsView();

    void refresh() override;

private:
    void loadBookings();
};

} // namespace ClickFlash
