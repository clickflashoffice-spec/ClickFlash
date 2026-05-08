#pragma once

#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>
#include <QFormLayout>
#include <QLineEdit>
#include <QCheckBox>
#include <QSpinBox>
#include <QComboBox>
#include <QTimeEdit>
#include <QTableWidget>

namespace ClickFlash {

class BackupTab : public QWidget {
    Q_OBJECT

public:
    explicit BackupTab(QWidget* parent = nullptr);

private slots:
    void saveSettings();
    void runBackup();
    void viewBackupHistory();

private:
    void loadSettings();
    
    QCheckBox* m_autoBackup;
    QSpinBox* m_frequency;
    QComboBox* m_frequencyUnit;
    QLineEdit* m_backupDir;
    QSpinBox* m_retentionDays;
    QCheckBox* m_compressBackups;
    QCheckBox* m_encryptBackups;
    QLineEdit* m_encryptionKey;
    QTableWidget* m_historyTable;
    QPushButton* m_browseDir;
    QPushButton* m_backupNowBtn;
    QPushButton* m_historyBtn;
};

} // namespace ClickFlash