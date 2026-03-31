#include "ui/common/Modal.h"

namespace ClickFlash {

Modal::Modal(const QString& title, QWidget* parent)
    : QDialog(parent)
    , m_result(0)
{
    setupUi(title);
}

Modal::~Modal() {}

void Modal::setupUi(const QString& title) {
    setWindowTitle(title);
    setModal(true);
    setMinimumWidth(400);
    setStyleSheet(R"(
        QDialog {
            background-color: #1a1a2e;
        }
        QLabel {
            color: #ffffff;
        }
        QPushButton {
            background-color: #16213e;
            color: #ffffff;
            border: 1px solid #0f3460;
            padding: 8px 16px;
            border-radius: 4px;
            min-width: 80px;
        }
        QPushButton:hover {
            background-color: #0f3460;
        }
        QPushButton#primary {
            background-color: #e94560;
            border-color: #e94560;
        }
        QPushButton#primary:hover {
            background-color: #d63850;
        }
    )");
    
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(24, 24, 24, 24);
    mainLayout->setSpacing(16);
    
    QLabel* titleLabel = new QLabel(title, this);
    titleLabel->setStyleSheet("font-size: 18px; font-weight: bold;");
    mainLayout->addWidget(titleLabel);
    
    m_contentLayout = new QVBoxLayout();
    mainLayout->addLayout(m_contentLayout);
    
    mainLayout->addStretch();
    
    m_buttonLayout = new QHBoxLayout();
    m_buttonLayout->addStretch();
    mainLayout->addLayout(m_buttonLayout);
    
    setLayout(mainLayout);
}

void Modal::setContent(QWidget* widget) {
    m_contentLayout->addWidget(widget);
}

void Modal::setMessage(const QString& message) {
    QLabel* messageLabel = new QLabel(message, this);
    messageLabel->setWordWrap(true);
    messageLabel->setStyleSheet("color: #a0a0a0;");
    m_contentLayout->addWidget(messageLabel);
}

QPushButton* Modal::addButton(const QString& text) {
    QPushButton* btn = new QPushButton(text, this);
    
    if (m_buttons.isEmpty()) {
        btn->setObjectName("primary");
    }
    
    connect(btn, &QPushButton::clicked, this, [this, btn]() {
        m_result = m_buttons.indexOf(btn) + 1;
        accept();
    });
    
    m_buttons.append(btn);
    m_buttonLayout->insertWidget(m_buttonLayout->count() - 1, btn);
    
    return btn;
}

int Modal::confirm(const QString& title, const QString& message, QWidget* parent) {
    Modal modal(title, parent);
    modal.setMessage(message);
    modal.addButton("Cancel");
    modal.addButton("Confirm");
    modal.exec();
    return modal.result();
}

void Modal::info(const QString& title, const QString& message, QWidget* parent) {
    Modal modal(title, parent);
    modal.setMessage(message);
    modal.addButton("OK");
    modal.exec();
}

void Modal::warning(const QString& title, const QString& message, QWidget* parent) {
    Modal modal(title, parent);
    modal.setMessage(message);
    modal.addButton("OK");
    modal.exec();
}

bool Modal::question(const QString& title, const QString& message, QWidget* parent) {
    return confirm(title, message, parent) == 2;
}

} // namespace ClickFlash
