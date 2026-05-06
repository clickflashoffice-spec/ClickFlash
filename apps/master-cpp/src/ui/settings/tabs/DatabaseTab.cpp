#include "ui/settings/tabs/DatabaseTab.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include "utils/FileUtils.h"

#include <QMessageBox>
#include <QFileDialog>
#include <QDateTime>
#include <QProcess>
#include <QCoreApplication>
#include <QGroupBox>

namespace ClickFlash {

DatabaseTab::DatabaseTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    // Backup section
    QGroupBox* backupGroup = new QGroupBox("Backup & Restore", this);
    QFormLayout* backupForm = new QFormLayout();
    
    m_backupPath = new QLineEdit(this);
    m_browseBtn = new QPushButton("Browse...", this);
    m_backupBtn = new QPushButton("Create Backup", this);
    m_restoreBtn = new QPushButton("Restore Backup", this);
    m_vacuumBtn = new QPushButton("Optimize Database", this);
    m_exportBtn = new QPushButton("Export Schema", this);
    m_progressBar = new QProgressBar(this);
    m_logOutput = new QTextEdit(this);
    
    m_logOutput->setReadOnly(true);
    m_logOutput->setMaximumHeight(100);
    
    connect(m_browseBtn, &QPushButton::clicked, this, [this]() {
        QString dir = QFileDialog::getExistingDirectory(this, "Select Backup Directory", m_backupPath->text());
        if (!dir.isEmpty()) {
            m_backupPath->setText(dir);
        }
    });
    
    connect(m_backupBtn, &QPushButton::clicked, this, &DatabaseTab::backupDatabase);
    connect(m_restoreBtn, &QPushButton::clicked, this, &DatabaseTab::restoreDatabase);
    connect(m_vacuumBtn, &QPushButton::clicked, this, &DatabaseTab::vacuumDatabase);
    connect(m_exportBtn, &QPushButton::clicked, this, &DatabaseTab::exportSchema);
    
    QHBoxLayout* pathLayout = new QHBoxLayout();
    pathLayout->addWidget(m_backupPath);
    pathLayout->addWidget(m_browseBtn);
    
    QHBoxLayout* btnLayout = new QHBoxLayout();
    btnLayout->addWidget(m_backupBtn);
    btnLayout->addWidget(m_restoreBtn);
    btnLayout->addWidget(m_vacuumBtn);
    btnLayout->addWidget(m_exportBtn);
    btnLayout->addStretch();
    
    backupForm->addRow("Backup Directory:", pathLayout);
    backupForm->addRow("", btnLayout);
    backupForm->addRow("Progress:", m_progressBar);
    backupForm->addRow("Log:", m_logOutput);
    
    backupGroup->setLayout(backupForm);
    mainLayout->addWidget(backupGroup);
    
    mainLayout->addStretch();
    
    // Set default backup path
    m_backupPath->setText(QCoreApplication::applicationDirPath() + "/backups");
}

void DatabaseTab::backupDatabase() {
    QString backupDir = m_backupPath->text();
    if (!FileUtils::ensureDirectory(backupDir)) {
        QMessageBox::critical(this, "Error", "Failed to create backup directory.");
        return;
    }
    
    QString timestamp = QDateTime::currentDateTime().toString("yyyyMMdd_hhmmss");
    QString backupFile = backupDir + "/clickflash_backup_" + timestamp + ".db";
    
    m_progressBar->setValue(10);
    m_logOutput->append("Starting backup to: " + backupFile);
    
    // Copy database file
    QString dbPath = "master.db";
    if (FileUtils::copyFile(dbPath, backupFile)) {
        m_progressBar->setValue(100);
        m_logOutput->append("Backup completed successfully!");
        QMessageBox::information(this, "Backup Complete", "Database backed up to:\n" + backupFile);
    } else {
        m_progressBar->setValue(0);
        m_logOutput->append("Backup failed!");
        QMessageBox::critical(this, "Backup Failed", "Failed to create database backup.");
    }
}

void DatabaseTab::restoreDatabase() {
    QString fileName = QFileDialog::getOpenFileName(this, "Select Backup File", 
        m_backupPath->text(), "SQLite Database (*.db)");
    
    if (fileName.isEmpty()) return;
    
    int ret = QMessageBox::warning(this, "Confirm Restore", 
        "This will replace the current database. Are you sure?", QMessageBox::Yes | QMessageBox::No);
    
    if (ret != QMessageBox::Yes) return;
    
    m_progressBar->setValue(10);
    m_logOutput->append("Restoring from: " + fileName);
    
    // Close current database connection
    DatabaseManager::instance().close();
    
    // Copy backup over
    if (FileUtils::copyFile(fileName, "master.db")) {
        m_progressBar->setValue(100);
        m_logOutput->append("Restore completed!");
        QMessageBox::information(this, "Restore Complete", "Database restored from:\n" + fileName);
    } else {
        m_progressBar->setValue(0);
        m_logOutput->append("Restore failed!");
        QMessageBox::critical(this, "Restore Failed", "Failed to restore database.");
    }
}

void DatabaseTab::vacuumDatabase() {
    m_progressBar->setValue(10);
    m_logOutput->append("Optimizing database...");
    
    bool success = DatabaseManager::instance().execute("VACUUM");
    
    if (success) {
        m_progressBar->setValue(100);
        m_logOutput->append("Database optimized successfully!");
        QMessageBox::information(this, "Optimization Complete", "Database has been optimized.");
    } else {
        m_progressBar->setValue(0);
        m_logOutput->append("Optimization failed!");
        QMessageBox::critical(this, "Optimization Failed", "Failed to optimize database.");
    }
}

void DatabaseTab::exportSchema() {
    QString fileName = QFileDialog::getSaveFileName(this, "Save Schema As",
        "clickflash_schema.sql", "SQL Files (*.sql)");
    
    if (fileName.isEmpty()) return;
    
    // Get schema using .schema command
    auto tables = DatabaseManager::instance().executeQueryMultiple(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    QString schema;
    for (const auto& table : tables) {
        QString tableName = table.value("name").toString();
        auto createStmt = DatabaseManager::instance().executeQuery(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name = :name",
            {{"name", tableName}}
        );
        
        if (!createStmt.isEmpty()) {
            schema += createStmt.value("sql").toString() + ";\n\n";
        }
    }
    
    if (FileUtils::writeTextFile(fileName, schema)) {
        QMessageBox::information(this, "Export Complete", "Schema exported to:\n" + fileName);
    } else {
        QMessageBox::critical(this, "Export Failed", "Failed to export schema.");
    }
}

} // namespace ClickFlash