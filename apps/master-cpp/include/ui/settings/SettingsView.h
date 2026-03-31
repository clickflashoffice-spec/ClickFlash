#pragma once

#include "ui/View.h"
#include <QTabWidget>

namespace ClickFlash {

class SettingsView : public View {
    Q_OBJECT

public:
    explicit SettingsView(QWidget* parent = nullptr);
    ~SettingsView();

    void refresh() override;

private slots:
    void onTabChanged(int index);

private:
    void setupTabs();

    QTabWidget* m_tabWidget;
};

} // namespace ClickFlash
