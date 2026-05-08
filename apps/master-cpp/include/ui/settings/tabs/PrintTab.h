#pragma once

#include <QWidget>
#include <QComboBox>
#include <QSpinBox>
#include <QCheckBox>
#include <QLineEdit>
#include <QPushButton>
#include <QVBoxLayout>
#include <QFormLayout>

namespace ClickFlash {

class PrintTab : public QWidget {
    Q_OBJECT

public:
    explicit PrintTab(QWidget* parent = nullptr);

private slots:
    void saveSettings();
    void testPrint();

private:
    void loadSettings();
    
    QComboBox* m_printer;
    QSpinBox* m_copies;
    QCheckBox* m_autoPrint;
    QCheckBox* m_colorMode;
    QComboBox* m_paperSize;
    QComboBox* m_quality;
    QCheckBox* m_duplex;
    QLineEdit* m_defaultLayout;
    QPushButton* m_refreshBtn;
    QPushButton* m_testBtn;
};

} // namespace ClickFlash