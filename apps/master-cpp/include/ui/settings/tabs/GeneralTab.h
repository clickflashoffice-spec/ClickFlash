#pragma once

#include <QWidget>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QFormLayout>
#include <QVBoxLayout>
#include <QCheckBox>
#include <QSpinBox>
#include <QComboBox>

namespace ClickFlash {

class GeneralTab : public QWidget {
    Q_OBJECT

public:
    explicit GeneralTab(QWidget* parent = nullptr);

private slots:
    void saveSettings();

private:
    void loadSettings();
    
    QLineEdit* m_appName;
    QLineEdit* m_dataDir;
    QSpinBox* m_port;
    QComboBox* m_logLevel;
    QCheckBox* m_autoStart;
    QCheckBox* m_autoUpdate;
    QSpinBox* m_maxRecentAlbums;
    QPushButton* m_browseDataDir;
};

} // namespace ClickFlash