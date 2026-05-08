#pragma once

#include <QWidget>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QFormLayout>
#include <QVBoxLayout>
#include <QCheckBox>
#include <QSpinBox>
#include <QTableWidget>

namespace ClickFlash {

class KioskTab : public QWidget {
    Q_OBJECT

public:
    explicit KioskTab(QWidget* parent = nullptr);

private slots:
    void saveSettings();
    void refreshDevices();

private:
    void loadSettings();
    
    QCheckBox* m_enabled;
    QLineEdit* m_pin;
    QSpinBox* m_timeout;
    QSpinBox* m_idleTimeout;
    QCheckBox* m_autoStart;
    QComboBox* m_slideshowInterval;
    QTableWidget* m_devicesTable;
    QPushButton* m_refreshBtn;
};

} // namespace ClickFlash