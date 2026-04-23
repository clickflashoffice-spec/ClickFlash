#pragma once

#include <QMainWindow>
#include <QStackedWidget>
#include <QMap>
#include <QString>
#include <QLabel>
#include <QPushButton>
#include <QTimer>

namespace ClickFlash {

class NavigationSidebar;

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget* parent = nullptr);
    ~MainWindow();

    void navigateTo(const QString& viewName);
    void showKioskMode(bool enabled);
    void lockKiosk();

signals:
    void viewChanged(const QString& viewName);
    void kioskModeChanged(bool enabled);

public slots:
    void onUnlockRequested();
    void onLockRequested();

private slots:
    void updateTime();
    void checkKioskTimeout();

protected:
    void closeEvent(QCloseEvent* event) override;
    bool eventFilter(QObject* obj, QEvent* event) override;

private:
    void setupUi();
    void setupNavigation();
    void setupKioskMode();
    void setupStatusBar();
    void applyTheme();

    QStackedWidget* m_contentStack;
    NavigationSidebar* m_sidebar;
    
    QLabel* m_timeLabel;
    QLabel* m_statusLabel;
    QPushButton* m_kioskButton;
    
    bool m_kioskMode;
    bool m_kioskLocked;
    QTimer* m_kioskTimer;
    QTimer* m_clockTimer;
    
    QMap<QString, QWidget*> m_views;
};

} // namespace ClickFlash
