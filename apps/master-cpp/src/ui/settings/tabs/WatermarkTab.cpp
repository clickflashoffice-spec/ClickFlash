#include "ui/settings/tabs/WatermarkTab.h"
#include "core/Config.h"
#include "core/Logger.h"

#include <QMessageBox>
#include <QFileDialog>
#include <QPainter>
#include <QImage>
#include <QGroupBox>

namespace ClickFlash {

WatermarkTab::WatermarkTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    QGroupBox* watermarkGroup = new QGroupBox("Watermark Settings", this);
    QFormLayout* form = new QFormLayout();
    
    m_enableWatermark = new QCheckBox("Enable watermark on photos", this);
    m_text = new QLineEdit(this);
    m_text->setPlaceholderText("© Your Company Name");
    m_logoPath = new QLineEdit(this);
    m_logoPath->setReadOnly(true);
    m_uploadBtn = new QPushButton("Upload Logo...", this);
    m_position = new QComboBox(this);
    m_opacity = new QSpinBox(this);
    m_fontSize = new QSpinBox(this);
    m_fontColor = new QComboBox(this);
    m_tileWatermark = new QCheckBox("Tile watermark across image", this);
    m_margin = new QSpinBox(this);
    m_previewLabel = new QLabel(this);
    
    m_position->addItems({"Top Left", "Top Right", "Bottom Left", "Bottom Right", "Center"});
    m_opacity->setRange(0, 100);
    m_opacity->setValue(30);
    m_opacity->setSuffix("%");
    
    m_fontSize->setRange(8, 72);
    m_fontSize->setValue(24);
    m_fontSize->setSuffix(" pt");
    
    m_fontColor->addItems({"White", "Black", "Custom"});
    m_margin->setRange(0, 100);
    m_margin->setValue(20);
    m_margin->setSuffix(" px");
    
    m_previewLabel->setMinimumSize(200, 150);
    m_previewLabel->setStyleSheet("border: 1px solid #ccc; background: #f0f0f0;");
    m_previewLabel->setAlignment(Qt::AlignCenter);
    
    connect(m_uploadBtn, &QPushButton::clicked, this, &WatermarkTab::uploadLogo);
    connect(m_enableWatermark, &QCheckBox::toggled, this, &WatermarkTab::previewWatermark);
    connect(m_text, &QLineEdit::textChanged, this, &WatermarkTab::previewWatermark);
    connect(m_opacity, QOverload<int>::of(&QSpinBox::valueChanged), this, &WatermarkTab::previewWatermark);
    connect(m_position, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &WatermarkTab::previewWatermark);
    
    QHBoxLayout* logoLayout = new QHBoxLayout();
    logoLayout->addWidget(m_logoPath);
    logoLayout->addWidget(m_uploadBtn);
    
    form->addRow("", m_enableWatermark);
    form->addRow("Watermark text:", m_text);
    form->addRow("Logo image:", logoLayout);
    form->addRow("Position:", m_position);
    form->addRow("Opacity:", m_opacity);
    form->addRow("Font size:", m_fontSize);
    form->addRow("Font color:", m_fontColor);
    form->addRow("Margin:", m_margin);
    form->addRow("", m_tileWatermark);
    form->addRow("Preview:", m_previewLabel);
    
    watermarkGroup->setLayout(form);
    mainLayout->addWidget(watermarkGroup);
    
    mainLayout->addStretch();
    
    QPushButton* saveBtn = new QPushButton("Save Settings", this);
    connect(saveBtn, &QPushButton::clicked, this, &WatermarkTab::saveSettings);
    mainLayout->addWidget(saveBtn);
    
    loadSettings();
    previewWatermark();
}

void WatermarkTab::loadSettings() {
    Config& config = Config::instance();
    m_opacity->setValue(static_cast<int>(config.getWatermarkOpacity() * 100));
}

void WatermarkTab::saveSettings() {
    Config& config = Config::instance();
    config.setWatermarkOpacity(m_opacity->value() / 100.0);
    config.save();
    
    CF_INFO("Watermark settings saved");
    QMessageBox::information(this, "Settings Saved", "Watermark settings have been saved.");
}

void WatermarkTab::previewWatermark() {
    if (!m_enableWatermark->isChecked()) {
        m_previewLabel->setText("Watermark disabled");
        return;
    }
    
    QString text = m_text->text();
    if (text.isEmpty()) {
        m_previewLabel->setText("Enter watermark text");
        return;
    }
    
    // Create preview image
    QImage preview(200, 150, QImage::Format_ARGB32);
    preview.fill(Qt::white);
    
    QPainter painter(&preview);
    painter.setPen(Qt::gray);
    painter.drawRect(0, 0, 199, 149);
    
    // Draw watermark text
    int opacity = m_opacity->value() * 255 / 100;
    QColor color(128, 128, 128, opacity);
    painter.setPen(color);
    
    QFont font;
    font.setPixelSize(m_fontSize->value());
    painter.setFont(font);
    
    QRect rect = preview.rect();
    rect.adjust(m_margin->value(), m_margin->value(), -m_margin->value(), -m_margin->value());
    
    Qt::Alignment alignment;
    switch (m_position->currentIndex()) {
        case 0: alignment = Qt::AlignTop | Qt::AlignLeft; break;
        case 1: alignment = Qt::AlignTop | Qt::AlignRight; break;
        case 2: alignment = Qt::AlignBottom | Qt::AlignLeft; break;
        case 3: alignment = Qt::AlignBottom | Qt::AlignRight; break;
        default: alignment = Qt::AlignCenter;
    }
    
    painter.drawText(rect, alignment, text);
    
    m_previewLabel->setPixmap(QPixmap::fromImage(preview));
}

void WatermarkTab::uploadLogo() {
    QString fileName = QFileDialog::getOpenFileName(this, "Select Logo Image",
        QString(), "Images (*.png *.jpg *.jpeg *.bmp)");
    
    if (!fileName.isEmpty()) {
        m_logoPath->setText(fileName);
        previewWatermark();
    }
}

} // namespace ClickFlash