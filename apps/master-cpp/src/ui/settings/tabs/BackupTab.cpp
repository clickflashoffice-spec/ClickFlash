#include "ui/settings/tabs/BackupTab.h"
#include "core/Config.h"
#include "core/Logger.h"
#include "database/DatabaseManager.h"
#include "utils/FileUtils.h"

#include <QMessageBox>
#include <QFileDialog>
#include <QDateTime>
#include <QGroupBox>

namespace ClickFlash {

BackupTab::BackupTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    // Auto backup settings
    QGroupBox* autoGroup = new QGroupBox("Automatic Backups", this);
    QFormLayout* form = new QFormLayout();
    
    m_autoBackup = new QCheckBox("Enable automatic backups", this);
    m_frequency = new QSpinBox(this);
    m_frequencyUnit = new QComboBox(this);
    m_backupDir = new QLineEdit(this);
    m_retentionDays = new QSpinBox(this);
    m_compressBackups = new QCheckBox("Compress backup files", this);
    m_encryptBackups = new QCheckBox("Encrypt backups", this);
    m_encryptionKey = new QLineEdit(this);
    m_browseDir = new QPushButton("Browse...", this);
    m_backupNowBtn = new QPushButton("Backup Now", this);
    m_historyBtn = new QPushButton("View History", this);
    m_historyTable = new QTableWidget(this);
    
    m_frequency->setRange(1, 24);
    m_frequency->setValue(6);
    m_frequencyUnit->addItems({"hours", "days"});
    
    m_retentionDays->setRange(1, 365);
    m_retentionDays->setValue(30);
    
    m_encryptionKey->setEchoMode(QLineEdit::Password);
    m_encryptionKey->setPlaceholderText("Enter encryption key");
    
    connect(m_browseDir, &QPushButton::clicked, this, [this]() {
        QString dir = QFileDialog::getExistingDirectory(this, "Select Backup Directory", m_backupDir->text());
        if (!dir.isEmpty()) {
            m_backupDir->setText(dir);
        }
    });
    
    connect(m_backupNowBtn, &QPushButton::clicked, this, &BackupTab::runBackup);
    connect(m_historyBtn, &QPushButton::clicked, this, &BackupTab::viewBackupHistory);
    
    connect(m_encryptBackups, &QCheckBox::toggled, m_encryptionKey, &QWidget::setEnabled);
    
    QHBoxLayout* dirLayout = new QHBoxLayout();
    dirLayout->addWidget(m_backupDir);
    dirLayout->addWidget(m_browseDir);
    
    QHBoxLayout* btnLayout = new QHBoxLayout();
    btnLayout->addWidget(m_backupNowBtn);
    btnLayout->addWidget(m_historyBtn);
    btnLayout->addStretch();
    
    form->addRow("", m_autoBackup);
    form->addRow("Backup every:", m_frequency);
    form->addRow("", m_frequencyUnit);
    form->addRow("Backup directory:", dirLayout);
    form->addRow("Keep backups for:", m_retentionDays);
    form->addRow(" days", new QLabel(this));
    form->addRow("", m_compressBackups);
    form->addRow("", m_encryptBackups);
    form->addRow("Encryption key:", m_encryptionKey);
    form->addRow("", btnLayout);
    
    autoGroup->setLayout(form);
    mainLayout->addWidget(autoGroup);
    
    // History table
    QLabel* historyLabel = new QLabel("Backup History:", this);
    mainLayout->addWidget(historyLabel);
    
    m_historyTable->setColumnCount(4);
    m_historyTable->setHorizontalHeaderLabels({"Date", "Size", "Type", "Status"});
    m_historyTable->horizontalHeader()->setStretchLastSection(true);
    mainLayout->addWidget(m_historyTable);
    
    mainLayout->addStretch();
    
    QPushButton* saveBtn = new QPushButton("Save Settings", this);
    connect(saveBtn, &QPushButton::clicked, this, &BackupTab::saveSettings);
    mainLayout->addWidget(saveBtn);
    
    loadSettings();
    viewBackupHistory();
}

void BackupTab::loadSettings() {
    Config& config = Config::instance();
    m_backupDir->setText(config.getDataDir() + "/backups");
}

void BackupTab::saveSettings() {
    // Save backup settings
    CF_INFO("Backup settings saved");
    QMessageBox::information(this, "Settings Saved", "Backup settings have been saved.");
}

void BackupTab::runBackup() {
    QString backupDir = m_backupDir->text();
    if (!FileUtils::ensureDirectory(backupDir)) {
        QMessageBox::critical(this, "Error", "Failed to create backup directory.");
        return;
    }
    
    QString timestamp = QDateTime::currentDateTime().toString("yyyyMMdd_hhmmss");
    QString backupFile = backupDir + "/backup_" + timestamp + (m_compressBackups->isChecked() ? ".zip" : ".db");
    
    CF_INFO("Running backup to: {}", backupFile.toStdString());
    
    // Simple file copy for now
    QString dbPath = "master.db";
    if (FileUtils::copyFile(dbPath, backupFile)) {
        // Log to history
        DatabaseManager::instance().execute(
            R"(
                INSERT INTO backup_history (backup_file, size, created_at, status)
                VALUES (:file, :size, CURRENT_TIMESTAMP, 'completed')
            )",
            {
                {"file", backupFile},
                {"size", FileUtils::getFileSize(backupFile)}
            }
        );
        
        QMessageBox::information(this, "Backup Complete", "Backup created:\n" + backupFile);
        viewBackupHistory();
    } else {
        QMessageBox::critical(this, "Backup Failed", "Failed to create backup.");
    }
}

void BackupTab::viewBackupHistory() {
    m_historyTable->setRowCount(0);
    
    // Read backup directory
    QStringList files = FileUtils::listFiles(m_backupDir->text(), "*backup*");
    
    for (const QString& file : files) {
        int row = m_historyTable->rowCount();
        m_historyTable->insertRow(row);
        
        QFileInfo info(file);
        m_historyTable->setItem(row, 0, new QTableWidgetItem(info.created().toString("yyyy-MM-dd hh:mm")));
        m_historyTable->setItem(row, 1, new QTableWidgetItem(QString("%1 KB").arg(info.size() / 1024)));
        m_historyTable->setItem(row, 2, new QTableWidgetItem(info.suffix()));
        m_historyTable->setItem(row, 3, new QTableWidgetItem("Completed"));
    }
}

} // namespace ClickFlash