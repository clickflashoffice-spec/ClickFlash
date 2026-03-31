#include "ui/settings/SettingsView.h"
#include "core/Config.h"
#include "core/Logger.h"

namespace ClickFlash {

SettingsView::SettingsView(QWidget* parent)
    : View(parent)
{
    QHBoxLayout* headerLayout = new QHBoxLayout();
    QLabel* title = new QLabel("Settings", this);
    title->setStyleSheet("font-size: 24px; font-weight: bold; color: #ffffff;");
    headerLayout->addWidget(title);
    headerLayout->addStretch();
    
    m_tabWidget = new QTabWidget(this);
    m_tabWidget->setStyleSheet(R"(
        QTabWidget {
            background-color: #16213e;
            border-radius: 8px;
        }
        QTabBar::tab {
            background-color: #1a2744;
            color: #a0a0a0;
            padding: 12px 24px;
            border: none;
        }
        QTabBar::tab:selected {
            background-color: #0f3460;
            color: #ffffff;
        }
        QTabBar::tab:hover {
            background-color: #243b55;
        }
    )");
    
    QWidget* generalTab = new QWidget(m_tabWidget);
    generalTab->setStyleSheet("background-color: #16213e; padding: 16px;");
    QLabel* generalLabel = new QLabel("General Settings", generalTab);
    generalLabel->setAlignment(Qt::AlignCenter);
    generalLabel->setStyleSheet("color: #a0a0a0;");
    
    QWidget* cloudTab = new QWidget(m_tabWidget);
    cloudTab->setStyleSheet("background-color: #16213e; padding: 16px;");
    QLabel* cloudLabel = new QLabel("Cloud Settings", cloudTab);
    cloudLabel->setAlignment(Qt::AlignCenter);
    cloudLabel->setStyleSheet("color: #a0a0a0;");
    
    QWidget* kioskTab = new QWidget(m_tabWidget);
    kioskTab->setStyleSheet("background-color: #16213e; padding: 16px;");
    QLabel* kioskLabel = new QLabel("Kiosk Settings", kioskTab);
    kioskLabel->setAlignment(Qt::AlignCenter);
    kioskLabel->setStyleSheet("color: #a0a0a0;");
    
    QWidget* printTab = new QWidget(m_tabWidget);
    printTab->setStyleSheet("background-color: #16213e; padding: 16px;");
    QLabel* printLabel = new QLabel("Print Settings", printTab);
    printLabel->setAlignment(Qt::AlignCenter);
    printLabel->setStyleSheet("color: #a0a0a0;");
    
    m_tabWidget->addTab(generalTab, "General");
    m_tabWidget->addTab(cloudTab, "Cloud");
    m_tabWidget->addTab(kioskTab, "Kiosk");
    m_tabWidget->addTab(printTab, "Print");
    
    connect(m_tabWidget, &QTabWidget::currentChanged, this, &SettingsView::onTabChanged);
    
    mainLayout->addLayout(headerLayout);
    mainLayout->addWidget(m_tabWidget);
}

SettingsView::~SettingsView() {}

void SettingsView::refresh() {
    CF_DEBUG("Settings refreshed");
}

void SettingsView::onTabChanged(int index) {
    CF_DEBUG("Settings tab changed to {}", index);
}

} // namespace ClickFlash
