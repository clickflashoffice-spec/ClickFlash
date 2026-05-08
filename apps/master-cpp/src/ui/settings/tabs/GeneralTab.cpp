#include "ui/settings/tabs/GeneralTab.h"
#include "core/Config.h"
#include "core/Logger.h"
#include "utils/FileUtils.h"

#include <QMessageBox>
#include <QFileDialog>

namespace ClickFlash {

GeneralTab::GeneralTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    QFormLayout* form = new QFormLayout();
    
    m_appName = new QLineEdit(this);
    m_dataDir = new QLineEdit(this);
    m_browseDataDir = new QPushButton("Browse...", this);
    m_port = new QSpinBox(this);
    m_logLevel = new QComboBox(this);
    m_autoStart = new QCheckBox("Start on system boot", this);
    m_autoUpdate = new QCheckBox("Auto-update on startup", this);
    m_maxRecentAlbums = new QSpinBox(this);
    
    m_port->setRange(1024, 65535);
    m_port->setValue(8090);
    
    m_logLevel->addItems({"debug", "info", "warning", "error", "critical"});
    
    m_maxRecentAlbums->setRange(5, 50);
    m_maxRecentAlbums->setValue(10);
    
    connect(m_browseDataDir, &QPushButton::clicked, this, [this]() {
        QString dir = QFileDialog::getExistingDirectory(this, "Select Data Directory", m_dataDir->text());
        if (!dir.isEmpty()) {
            m_dataDir->setText(dir);
        }
    });
    
    QHBoxLayout* dataDirLayout = new QHBoxLayout();
    dataDirLayout->addWidget(m_dataDir);
    dataDirLayout->addWidget(m_browseDataDir);
    
    form->addRow("Application Name:", m_appName);
    form->addRow("Data Directory:", dataDirLayout);
    form->addRow("HTTP Port:", m_port);
    form->addRow("Log Level:", m_logLevel);
    form->addRow("Max Recent Albums:", m_maxRecentAlbums);
    form->addRow("", m_autoStart);
    form->addRow("", m_autoUpdate);
    
    mainLayout->addLayout(form);
    mainLayout->addStretch();
    
    QPushButton* saveBtn = new QPushButton("Save Settings", this);
    connect(saveBtn, &QPushButton::clicked, this, &GeneralTab::saveSettings);
    mainLayout->addWidget(saveBtn);
    
    loadSettings();
}

void GeneralTab::loadSettings() {
    Config& config = Config::instance();
    
    m_appName->setText("ClickFlash Master");
    m_dataDir->setText(config.getDataDir());
    m_port->setValue(config.getPort());
    m_logLevel->setCurrentText(config.getLogLevel());
}

void GeneralTab::saveSettings() {
    Config& config = Config::instance();
    
    config.setDataDir(m_dataDir->text());
    config.setPort(m_port->value());
    config.setLogLevel(m_logLevel->currentText());
    config.save();
    
    CF_INFO("General settings saved");
    QMessageBox::information(this, "Settings Saved", "General settings have been saved.");
}

} // namespace ClickFlash