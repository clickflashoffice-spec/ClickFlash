#include "ui/common/Button.h"
#include "core/Logger.h"

#include <QEvent>

namespace ClickFlash {

Button::Button(QWidget* parent)
    : QPushButton(parent)
    , m_buttonType("primary")
    , m_hoverColor("#0f3460")
{
    setupStyle();
}

Button::Button(const QString& text, QWidget* parent)
    : QPushButton(text, parent)
    , m_buttonType("primary")
    , m_hoverColor("#0f3460")
{
    setupStyle();
}

void Button::setupStyle() {
    QString baseStyle = R"(
        QPushButton {
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            outline: none;
        }
        QPushButton:pressed {
            transform: translateY(1px);
        }
        QPushButton:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    )";
    
    if (m_buttonType == "primary") {
        setStyleSheet(baseStyle + R"(
            QPushButton {
                background-color: #e94560;
                color: white;
            }
            QPushButton:hover {
                background-color: #d63d56;
            }
        )");
        m_hoverColor = QColor("#d63d56");
    } else if (m_buttonType == "secondary") {
        setStyleSheet(baseStyle + R"(
            QPushButton {
                background-color: #16213e;
                color: #e0e0e0;
                border: 1px solid #0f3460;
            }
            QPushButton:hover {
                background-color: #0f3460;
            }
        )");
        m_hoverColor = QColor("#0f3460");
    } else if (m_buttonType == "danger") {
        setStyleSheet(baseStyle + R"(
            QPushButton {
                background-color: #dc3545;
                color: white;
            }
            QPushButton:hover {
                background-color: #c82333;
            }
        )");
        m_hoverColor = QColor("#c82333");
    } else if (m_buttonType == "success") {
        setStyleSheet(baseStyle + R"(
            QPushButton {
                background-color: #28a745;
                color: white;
            }
            QPushButton:hover {
                background-color: #218838;
            }
        )");
        m_hoverColor = QColor("#218838");
    } else if (m_buttonType == "ghost") {
        setStyleSheet(baseStyle + R"(
            QPushButton {
                background-color: transparent;
                color: #e0e0e0;
                border: 1px solid #0f3460;
            }
            QPushButton:hover {
                background-color: #16213e;
            }
        )");
        m_hoverColor = QColor("#16213e");
    }
    
    m_originalStyle = styleSheet();
}

void Button::setButtonType(const QString& type) {
    m_buttonType = type;
    setupStyle();
}

void Button::setHoverColor(const QColor& color) {
    m_hoverColor = color;
}

void Button::setIcon(const QString& iconPath) {
    // Would load icon from path
    CF_DEBUG("Button icon set: {}", iconPath.toStdString());
}

void Button::enterEvent(QEvent* event) {
    QPushButton::enterEvent(event);
    // Could add hover animation here
}

void Button::leaveEvent(QEvent* event) {
    QPushButton::leaveEvent(event);
    // Could reset hover state here
}

void Button::handleClick() {
    emit clickedWithCheck();
}

} // namespace ClickFlash