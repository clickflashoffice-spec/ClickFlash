#include "ui/settings/tabs/KioskTab.h"
#include "core/Config.h"
#include "core/Logger.h"
#include "database/DatabaseManager.h"

#include <QMessageBox>

namespace ClickFlash {

KioskTab::KioskTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    QFormLayout* form = new QFormLayout();
    
    m_enabled = new QCheckBox("Enable Kiosk Mode", this);
    m_pin = new QLineEdit(this);
    m_pin->setEchoMode(QLineEdit::Password);
    m_timeout = new QSpinBox(this);
    m_idleTimeout = new QSpinBox(this);
    m_autoStart = new QCheckBox("Start in kiosk mode", this);
    m_slideshowInterval = new QComboBox(this);
    
    m_timeout->setRange(30, 3600);
    m_timeout->setSuffix(" seconds");
    m_timeout->setValue(300);
    
    m_idleTimeout->setRange(60, 3600);
    m_idleTimeout->setSuffix(" seconds");
    m_idleTimeout->setValue(600);
    
    m_slideshowInterval->addItems({"5 seconds", "10 seconds", "15 seconds", "30 seconds", "60 seconds"});
    m_slideshowInterval->setCurrentIndex(1);
    
    form->addRow("", m_enabled);
    form->addRow("PIN Code:", m_pin);
    form->addRow("Session Timeout:", m_timeout);
    form->addRow("Idle Timeout:", m_idleTimeout);
    form->addRow("Slideshow Interval:", m_slideshowInterval);
    form->addRow("", m_autoStart);
    
    mainLayout->addLayout(form);
    
    // Devices table
    QLabel* devicesLabel = new QLabel("Paired Devices:", this);
    mainLayout->addWidget(devicesLabel);
    
    m_devicesTable = new QTableWidget(this);
    m_devicesTable->setColumnCount(4);
    m_devicesTable->setHorizontalHeaderLabels({"Name", "Status", "Last Seen", "Actions"});
    m_devicesTable->horizontalHeader()->setStretchLastSection(true);
    m_devicesTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    mainLayout->addWidget(m_devicesTable);
    
    m_refreshBtn = new QPushButton("Refresh", this);
    connect(m_refreshBtn, &QPushButton::clicked, this, &KioskTab::refreshDevices);
    
    QHBoxLayout* btnLayout = new QHBoxLayout();
    btnLayout->addWidget(m_refreshBtn);
    btnLayout->addStretch();
    mainLayout->addLayout(btnLayout);
    
    mainLayout->addStretch();
    
    QPushButton* saveBtn = new QPushButton("Save Settings", this);
    connect(saveBtn, &QPushButton::clicked, this, &KioskTab::saveSettings);
    mainLayout->addWidget(saveBtn);
    
    loadSettings();
    refreshDevices();
}

void KioskTab::loadSettings() {
    Config& config = Config::instance();
    
    m_enabled->setChecked(config.getKioskMode());
    m_pin->setText(config.getKioskPin());
}

void KioskTab::saveSettings() {
    Config& config = Config::instance();
    
    config.setKioskMode(m_enabled->isChecked());
    config.setKioskPin(m_pin->text());
    config.save();
    
    CF_INFO("Kiosk settings saved");
    QMessageBox::information(this, "Settings Saved", "Kiosk settings have been saved.");
}

void KioskTab::refreshDevices() {
    m_devicesTable->setRowCount(0);
    
    auto kiosks = DatabaseManager::instance().executeQueryMultiple(
        "SELECT * FROM kiosks ORDER BY paired_at DESC"
    );
    
    for (const auto& kiosk : kiosks) {
        int row = m_devicesTable->rowCount();
        m_devicesTable->insertRow(row);
        
        m_devicesTable->setItem(row, 0, new QTableWidgetItem(kiosk.value("name").toString()));
        m_devicesTable->setItem(row, 1, new QTableWidgetItem(kiosk.value("status").toString()));
        m_devicesTable->setItem(row, 2, new QTableWidgetItem(kiosk.value("last_seen").toString()));
        
        QPushButton* unpairBtn = new QPushButton("Unpair");
        m_devicesTable->setCellWidget(row, 3, unpairBtn);
    }
}

} // namespace ClickFlash