#include "ui/common/Input.h"

namespace ClickFlash {

Input::Input(const QString& label, QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    
    m_label = new QLabel(label, this);
    m_label->setStyleSheet("color: #a0a0a0; font-size: 12px; margin-bottom: 4px;");
    
    m_lineEdit = new QLineEdit(this);
    m_lineEdit->setStyleSheet(R"(
        QLineEdit {
            background-color: #16213e;
            color: #ffffff;
            border: 1px solid #2a2a4a;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
        }
        QLineEdit:focus {
            border-color: #e94560;
        }
        QLineEdit:disabled {
            background-color: #1a2744;
            color: #666666;
        }
    )");
    
    connect(m_lineEdit, &QLineEdit::textChanged, this, &Input::textChanged);
    connect(m_lineEdit, &QLineEdit::editingFinished, this, &Input::editingFinished);
    
    layout->addWidget(m_label);
    layout->addWidget(m_lineEdit);
    
    setLayout(layout);
}

Input::~Input() {}

QString Input::text() const {
    return m_lineEdit->text();
}

void Input::setText(const QString& text) {
    m_lineEdit->setText(text);
}

void Input::setPlaceholder(const QString& placeholder) {
    m_lineEdit->setPlaceholderText(placeholder);
}

void Input::setReadOnly(bool readOnly) {
    m_lineEdit->setReadOnly(readOnly);
}

void Input::setEnabled(bool enabled) {
    m_lineEdit->setEnabled(enabled);
}

Select::Select(const QString& label, QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    
    m_label = new QLabel(label, this);
    m_label->setStyleSheet("color: #a0a0a0; font-size: 12px; margin-bottom: 4px;");
    
    m_comboBox = new QComboBox(this);
    m_comboBox->setStyleSheet(R"(
        QComboBox {
            background-color: #16213e;
            color: #ffffff;
            border: 1px solid #2a2a4a;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
        }
        QComboBox:hover {
            border-color: #e94560;
        }
        QComboBox::drop-down {
            border: none;
        }
        QComboBox::down-arrow {
            image: none;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid #a0a0a0;
            margin-right: 10px;
        }
        QComboBox QAbstractItemView {
            background-color: #16213e;
            color: #ffffff;
            border: 1px solid #2a2a4a;
            selection-background-color: #0f3460;
        }
    )");
    
    connect(m_comboBox, QOverload<int>::of(&QComboBox::currentIndexChanged),
            this, &Select::currentIndexChanged);
    connect(m_comboBox, &QComboBox::currentTextChanged,
            this, &Select::currentTextChanged);
    
    layout->addWidget(m_label);
    layout->addWidget(m_comboBox);
    
    setLayout(layout);
}

Select::~Select() {}

QString Select::currentText() const {
    return m_comboBox->currentText();
}

int Select::currentIndex() const {
    return m_comboBox->currentIndex();
}

QVariant Select::currentData() const {
    return m_comboBox->currentData();
}

void Select::addItem(const QString& text, const QVariant& data) {
    m_comboBox->addItem(text, data);
}

void Select::addItems(const QStringList& items) {
    m_comboBox->addItems(items);
}

void Select::clear() {
    m_comboBox->clear();
}

void Select::setValue(const QString& value) {
    int index = m_comboBox->findText(value);
    if (index >= 0) {
        m_comboBox->setCurrentIndex(index);
    }
}

void Select::setValue(int value) {
    m_comboBox->setCurrentIndex(value);
}

} // namespace ClickFlash
