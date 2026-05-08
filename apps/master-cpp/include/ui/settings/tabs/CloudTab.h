#pragma once

#include <QWidget>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QFormLayout>
#include <QVBoxLayout>
#include <QCheckBox>
#include <QComboBox>
#include <QSpinBox>

namespace ClickFlash {

class CloudTab : public QWidget {
    Q_OBJECT

public:
    explicit CloudTab(QWidget* parent = nullptr);

private slots:
    void saveSettings();
    void testConnection();

private:
    void loadSettings();
    
    QCheckBox* m_enabled;
    QLineEdit* m_endpoint;
    QLineEdit* m_apiKey;
    QComboBox* m_syncMode;
    QSpinBox* m_interval;
    QCheckBox* m_autoSync;
    QCheckBox* m_compressUploads;
    QPushButton* m_testBtn;
    QLabel* m_statusLabel;
};

} // namespace ClickFlash