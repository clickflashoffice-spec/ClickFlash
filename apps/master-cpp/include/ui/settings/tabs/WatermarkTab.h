#pragma once

#include <QWidget>
#include <QLineEdit>
#include <QSpinBox>
#include <QComboBox>
#include <QCheckBox>
#include <QPushButton>
#include <QLabel>
#include <QVBoxLayout>
#include <QFormLayout>

namespace ClickFlash {

class WatermarkTab : public QWidget {
    Q_OBJECT

public:
    explicit WatermarkTab(QWidget* parent = nullptr);

private slots:
    void saveSettings();
    void previewWatermark();
    void uploadLogo();

private:
    void loadSettings();
    
    QCheckBox* m_enableWatermark;
    QLineEdit* m_text;
    QLineEdit* m_logoPath;
    QPushButton* m_uploadBtn;
    QComboBox* m_position;
    QSpinBox* m_opacity;
    QSpinBox* m_fontSize;
    QComboBox* m_fontColor;
    QCheckBox* m_tileWatermark;
    QSpinBox* m_margin;
    QLabel* m_previewLabel;
};

} // namespace ClickFlash