#include "ui/common/Toast.h"
#include <QApplication>
#include <QDesktopWidget>

namespace ClickFlash {

Toast::Toast(const QString& message, ToastType type, QWidget* parent)
    : QWidget(parent ? parent : QApplication::topLevelWidgets().first())
{
    setupUi(message, type);
    animateIn();
    
    m_timer = new QTimer(this);
    connect(m_timer, &QTimer::timeout, this, &Toast::onTimeout);
    m_timer->start(3000);
}

Toast::~Toast() {}

void Toast::setupUi(const QString& message, ToastType type) {
    setFixedWidth(350);
    setWindowFlags(Qt::FramelessWindowHint | Qt::Tool | Qt::X11BypassWindowManagerHint);
    setAttribute(Qt::WA_TranslucentBackground);
    setStyleSheet("background: transparent;");
    
    QWidget* container = new QWidget(this);
    container->setStyleSheet(QString(R"(
        QWidget {
            background-color: %1;
            border-radius: 8px;
            padding: 12px 16px;
        }
    )").arg(getColor(type)));
    
    QHBoxLayout* layout = new QHBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->addWidget(container);
    
    QHBoxLayout* innerLayout = new QHBoxLayout(container);
    innerLayout->setContentsMargins(12, 12, 12, 12);
    innerLayout->setSpacing(12);
    
    m_iconLabel = new QLabel(getIcon(type), container);
    m_iconLabel->setStyleSheet("font-size: 20px;");
    
    m_messageLabel = new QLabel(message, container);
    m_messageLabel->setStyleSheet("color: #ffffff; font-size: 14px;");
    m_messageLabel->setWordWrap(true);
    
    innerLayout->addWidget(m_iconLabel);
    innerLayout->addWidget(m_messageLabel, 1);
    
    container->setLayout(innerLayout);
    setLayout(layout);
    
    QDesktopWidget* desktop = QApplication::desktop();
    move(desktop->width() - width() - 20, 
         desktop->height() - height() - 20 - (m_activeToasts.size() * (height() + 10)));
}

void Toast::animateIn() {
    setWindowOpacity(0);
    QPropertyAnimation* animation = new QPropertyAnimation(this, "windowOpacity", this);
    animation->setDuration(200);
    animation->setStartValue(0);
    animation->setEndValue(1);
    animation->start();
}

void Toast::animateOut() {
    QPropertyAnimation* animation = new QPropertyAnimation(this, "windowOpacity", this);
    animation->setDuration(200);
    animation->setStartValue(1);
    animation->setEndValue(0);
    connect(animation, &QPropertyAnimation::finished, this, &QWidget::close);
    animation->start();
}

void Toast::onTimeout() {
    animateOut();
}

QString Toast::getIcon(ToastType type) {
    switch (type) {
        case ToastType::Success: return "✓";
        case ToastType::Warning: return "⚠";
        case ToastType::Error: return "✕";
        default: return "ℹ";
    }
}

QString Toast::getColor(ToastType type) {
    switch (type) {
        case ToastType::Success: return "#10b981";
        case ToastType::Warning: return "#f59e0b";
        case ToastType::Error: return "#ef4444";
        default: return "#3b82f6";
    }
}

void Toast::show(const QString& message, ToastType type, int duration) {
    Toast* toast = new Toast(message, type);
    toast->m_timer->setInterval(duration);
    toast->show();
    m_activeToasts.append(toast);
}

void Toast::showSuccess(const QString& message, int duration) {
    show(message, ToastType::Success, duration);
}

void Toast::showError(const QString& message, int duration) {
    show(message, ToastType::Error, duration);
}

void Toast::showWarning(const QString& message, int duration) {
    show(message, ToastType::Warning, duration);
}

QVector<Toast*> Toast::m_activeToasts;

void ToastManager::showToast(const QString& message, ToastType type, int duration) {
    Toast::show(message, type, duration);
}

} // namespace ClickFlash
