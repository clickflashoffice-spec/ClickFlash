#pragma once

#include "ui/View.h"

namespace ClickFlash {

class PhotographersView : public View {
    Q_OBJECT

public:
    explicit PhotographersView(QWidget* parent = nullptr);
    ~PhotographersView();

    void refresh() override;

private:
    void loadPhotographers();
};

} // namespace ClickFlash
