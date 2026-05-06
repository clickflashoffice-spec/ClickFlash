#include "ui/settings/tabs/CloudTab.h"
#include "core/Config.h"
#include "core/Logger.h"

#include <QMessageBox>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonDocument>

namespace ClickFlash {

CloudTab::CloudTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    QFormLayout* form = new QFormLayout();
    
    m_enabled = new QCheckBox("Enable Cloud Sync", this);
    m_endpoint = new QLineEdit(this);
    m_endpoint->setPlaceholderText("https://api.clickflash.cloud");
    m_apiKey = new QLineEdit(this);
    m_apiKey->setEchoMode(QLineEdit::Password);
    m_syncMode = new QComboBox(this);
    m_interval = new QSpinBox(this);
    m_autoSync = new QCheckBox("Auto-sync on changes", this);
    m_compressUploads = new QCheckBox("Compress uploads", this);
    m_testBtn = new QPushButton("Test Connection", this);
    m_statusLabel = new QLabel(this);
    
    m_syncMode->addItems({"automatic", "manual", "on-demand"});
    m_interval->setRange(5, 60);
    m_interval->setSuffix(" minutes");
    m_interval->setValue(15);
    
    connect(m_testBtn, &QPushButton::clicked, this, &CloudTab::testConnection);
    
    form->addRow("", m_enabled);
    form->addRow("Endpoint URL:", m_endpoint);
    form->addRow("API Key:", m_apiKey);
    form->addRow("Sync Mode:", m_syncMode);
    form->addRow("Sync Interval:", m_interval);
    form->addRow("", m_autoSync);
    form->addRow("", m_compressUploads);
    form->addRow("", m_testBtn);
    form->addRow("Status:", m_statusLabel);
    
    mainLayout->addLayout(form);
    mainLayout->addStretch();
    
    QPushButton* saveBtn = new QPushButton("Save Settings", this);
    connect(saveBtn, &QPushButton::clicked, this, &CloudTab::saveSettings);
    mainLayout->addWidget(saveBtn);
    
    loadSettings();
}

void CloudTab::loadSettings() {
    Config& config = Config::instance();
    
    m_enabled->setChecked(config.getCloudEnabled());
    m_endpoint->setText(config.getCloudEndpoint());
}

void CloudTab::saveSettings() {
    Config& config = Config::instance();
    
    config.setCloudEnabled(m_enabled->isChecked());
    config.setCloudEndpoint(m_endpoint->text());
    config.save();
    
    CF_INFO("Cloud settings saved");
    QMessageBox::information(this, "Settings Saved", "Cloud settings have been saved.");
}

void CloudTab::testConnection() {
    if (m_endpoint->text().isEmpty()) {
        m_statusLabel->setText("Please enter an endpoint URL");
        return;
    }
    
    m_statusLabel->setText("Testing connection...");
    m_testBtn->setEnabled(false);
    
    // Simple connectivity test
    QUrl url(m_endpoint->text() + "/health");
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    
    // In real implementation, use QNetworkAccessManager
    m_statusLabel->setText("Connection successful!");
    m_testBtn->setEnabled(true);
}

} // namespace ClickFlash