#pragma once

#include <QWidget>
#include <QTimer>
#include <QLabel>
#include <QVBoxLayout>
#include <QPropertyAnimation>
#include <QParallelAnimationGroup>

namespace ClickFlash {

enum class ToastType {
    Info,
    Success,
    Warning,
    Error
};

class Toast : public QWidget {
    Q_OBJECT

public:
    static void show(const QString& message, ToastType type = ToastType::Info, int duration = 3000);
    static void showSuccess(const QString& message, int duration = 3000);
    static void showError(const QString& message, int duration = 4000);
    static void showWarning(const QString& message, int duration = 4000);

private:
    explicit Toast(const QString& message, ToastType type, QWidget* parent = nullptr);
    ~Toast();
    
    void setupUi(const QString& message, ToastType type);
    void animateIn();
    void animateOut();
    
    static QString getIcon(ToastType type);
    static QString getColor(ToastType type);

private slots:
    void onTimeout();

private:
    QLabel* m_iconLabel;
    QLabel* m_messageLabel;
    QTimer* m_timer;
    QParallelAnimationGroup* m_animation;
};

class ToastManager : public QObject {
    Q_OBJECT

public:
    static ToastManager& instance() {
        static ToastManager instance;
        return instance;
    }
    
    void showToast(const QString& message, ToastType type = ToastType::Info, int duration = 3000);

private:
    ToastManager(QObject* parent = nullptr) : QObject(parent) {}
    ~ToastManager() = default;
    
    QVector<Toast*> m_activeToasts;
};

} // namespace ClickFlash
