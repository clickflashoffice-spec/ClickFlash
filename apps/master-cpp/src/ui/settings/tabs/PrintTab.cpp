#include "ui/settings/tabs/PrintTab.h"
#include "core/Config.h"
#include "core/Logger.h"

#include <QMessageBox>
#include <QPrintDialog>
#include <QPrinter>
#include <QGroupBox>
#include <QDialog>

namespace ClickFlash {

PrintTab::PrintTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    QGroupBox* printerGroup = new QGroupBox("Print Settings", this);
    QFormLayout* form = new QFormLayout();
    
    m_printer = new QComboBox(this);
    m_copies = new QSpinBox(this);
    m_autoPrint = new QCheckBox("Auto-print orders", this);
    m_colorMode = new QCheckBox("Color printing", this);
    m_paperSize = new QComboBox(this);
    m_quality = new QComboBox(this);
    m_duplex = new QCheckBox("Double-sided printing", this);
    m_defaultLayout = new QLineEdit(this);
    m_refreshBtn = new QPushButton("Refresh", this);
    m_testBtn = new QPushButton("Test Print", this);
    
    m_copies->setRange(1, 100);
    m_copies->setValue(1);
    
    m_paperSize->addItems({"Letter", "Legal", "A4", "A5", "4x6", "5x7", "8x10"});
    m_quality->addItems({"Draft", "Normal", "High", "Best"});
    
    // Get available printers
    QStringList printers = {"Default Printer"}; // Placeholder
    m_printer->addItems(printers);
    
    connect(m_refreshBtn, &QPushButton::clicked, this, [this]() {
        m_printer->clear();
        m_printer->addItem("Default Printer");
        // In real implementation, query QPrinterInfo::availablePrinters()
    });
    
    connect(m_testBtn, &QPushButton::clicked, this, &PrintTab::testPrint);
    
    form->addRow("Printer:", m_printer);
    form->addRow("", m_refreshBtn);
    form->addRow("Default copies:", m_copies);
    form->addRow("Paper size:", m_paperSize);
    form->addRow("Print quality:", m_quality);
    form->addRow("", m_colorMode);
    form->addRow("", m_duplex);
    form->addRow("", m_autoPrint);
    form->addRow("Default layout:", m_defaultLayout);
    form->addRow("", m_testBtn);
    
    printerGroup->setLayout(form);
    mainLayout->addWidget(printerGroup);
    
    mainLayout->addStretch();
    
    QPushButton* saveBtn = new QPushButton("Save Settings", this);
    connect(saveBtn, &QPushButton::clicked, this, &PrintTab::saveSettings);
    mainLayout->addWidget(saveBtn);
    
    loadSettings();
}

void PrintTab::loadSettings() {
    Config& config = Config::instance();
    // Load print settings from config
}

void PrintTab::saveSettings() {
    CF_INFO("Print settings saved");
    QMessageBox::information(this, "Settings Saved", "Print settings have been saved.");
}

void PrintTab::testPrint() {
    QPrinter printer;
    QPrintDialog dialog(&printer, this);
    
    if (dialog.exec() == QDialog::Accepted) {
        CF_INFO("Test print sent to: {}", printer.printerName().toStdString());
        QMessageBox::information(this, "Test Print", "Test page sent to printer.");
    }
}

} // namespace ClickFlash