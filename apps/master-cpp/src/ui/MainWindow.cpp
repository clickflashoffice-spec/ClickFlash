#include "ui/MainWindow.h"
#include "ui/NavigationSidebar.h"
#include "ui/dashboard/DashboardView.h"
#include "ui/albums/AlbumsView.h"
#include "ui/orders/OrdersView.h"
#include "ui/bookings/BookingsView.h"
#include "ui/photographers/PhotographersView.h"
#include "ui/settings/SettingsView.h"
#include "core/Logger.h"
#include "core/Config.h"

#include <QApplication>
#include <QStyleFactory>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFrame>
#include <QKeyEvent>
#include <QMenuBar>
#include <QStatusBar>
#include <QMessageBox>

namespace ClickFlash {

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
    , m_contentStack(new QStackedWidget(this))
    , m_sidebar(new NavigationSidebar(this))
    , m_timeLabel(new QLabel(this))
    , m_statusLabel(new QLabel("Ready", this))
    , m_kioskButton(new QPushButton("Lock", this))
    , m_kioskMode(false)
    , m_kioskLocked(false)
    , m_kioskTimer(new QTimer(this))
    , m_clockTimer(new QTimer(this))
{
    setupUi();
    setupNavigation();
    setupKioskMode();
    setupStatusBar();
    applyTheme();
    
    CF_INFO("MainWindow initialized");
}

MainWindow::~MainWindow() {
    CF_INFO("MainWindow destroyed");
}

void MainWindow::setupUi() {
    setWindowTitle("ClickFlash Master");
    setMinimumSize(1280, 800);
    resize(1600, 900);
    
    QWidget* centralWidget = new QWidget(this);
    QHBoxLayout* mainLayout = new QHBoxLayout(centralWidget);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);
    
    mainLayout->addWidget(m_sidebar);
    mainLayout->addWidget(m_contentStack, 1);
    
    setCentralWidget(centralWidget);
    
    installEventFilter(this);
}

void MainWindow::setupNavigation() {
    m_sidebar->setFixedWidth(220);
    
    connect(m_sidebar, &NavigationSidebar::navigateRequested, this, &MainWindow::navigateTo);
    
    m_views["dashboard"] = new DashboardView(this);
    m_views["albums"] = new AlbumsView(this);
    m_views["orders"] = new OrdersView(this);
    m_views["bookings"] = new BookingsView(this);
    m_views["photographers"] = new PhotographersView(this);
    m_views["settings"] = new SettingsView(this);
    
    for (auto it = m_views.constBegin(); it != m_views.constEnd(); ++it) {
        m_contentStack->addWidget(it.value());
    }
    
    navigateTo("dashboard");
}

void MainWindow::setupKioskMode() {
    m_sidebar->addAction("Lock", this, &MainWindow::onLockRequested);
    
    connect(m_kioskButton, &QPushButton::clicked, this, [this]() {
        if (m_kioskLocked) {
            onUnlockRequested();
        } else {
            onLockRequested();
        }
    });
    
    connect(m_kioskTimer, &QTimer::timeout, this, &MainWindow::checkKioskTimeout);
    m_kioskTimer->start(60000);
}

void MainWindow::setupStatusBar() {
    m_timeLabel->setStyleSheet("padding: 4px 8px;");
    statusBar()->addPermanentWidget(m_timeLabel);
    statusBar()->addPermanentWidget(m_kioskButton);
    statusBar()->addWidget(m_statusLabel);
    
    connect(m_clockTimer, &QTimer::timeout, this, &MainWindow::updateTime);
    m_clockTimer->start(1000);
    updateTime();
}

void MainWindow::applyTheme() {
    setStyleSheet(R"(
        QMainWindow {
            background-color: #1a1a2e;
        }
        QLabel {
            color: #e0e0e0;
        }
        QPushButton {
            background-color: #16213e;
            color: #e0e0e0;
            border: 1px solid #0f3460;
            padding: 8px 16px;
            border-radius: 4px;
        }
        QPushButton:hover {
            background-color: #0f3460;
        }
        QStatusBar {
            background-color: #16213e;
            color: #e0e0e0;
        }
    )");
}

void MainWindow::navigateTo(const QString& viewName) {
    if (m_views.contains(viewName)) {
        m_contentStack->setCurrentWidget(m_views[viewName]);
        m_sidebar->setActiveView(viewName);
        emit viewChanged(viewName);
        CF_DEBUG("Navigated to: {}", viewName.toStdString());
    }
}

void MainWindow::showKioskMode(bool enabled) {
    m_kioskMode = enabled;
    
    if (enabled) {
        showFullScreen();
        m_sidebar->setVisible(false);
        menuBar()->setVisible(false);
        statusBar()->setVisible(true);
        CF_INFO("Kiosk mode enabled");
    } else {
        showNormal();
        m_sidebar->setVisible(true);
        menuBar()->setVisible(true);
        CF_INFO("Kiosk mode disabled");
    }
    
    emit kioskModeChanged(enabled);
}

void MainWindow::lockKiosk() {
    m_kioskLocked = true;
    m_kioskButton->setText("Unlock");
    CF_INFO("Kiosk locked");
}

void MainWindow::onUnlockRequested() {
    bool ok;
    QString pin = QInputDialog::getText(this, "Unlock Kiosk", 
                                         "Enter PIN:", QLineEdit::Password, 
                                         "", &ok);
    if (ok && pin == Config::instance().getKioskPin()) {
        m_kioskLocked = false;
        m_kioskButton->setText("Lock");
        CF_INFO("Kiosk unlocked");
    } else if (ok) {
        QMessageBox::warning(this, "Invalid PIN", "The PIN you entered is incorrect.");
    }
}

void MainWindow::onLockRequested() {
    lockKiosk();
}

void MainWindow::updateTime() {
    m_timeLabel->setText(QDateTime::currentDateTime().toString("hh:mm:ss"));
}

void MainWindow::checkKioskTimeout() {
    if (!m_kioskMode) return;
}

void MainWindow::closeEvent(QCloseEvent* event) {
    if (m_kioskMode && !m_kioskLocked) {
        event->ignore();
        return;
    }
    
    int ret = QMessageBox::question(this, "Confirm Exit",
                                    "Are you sure you want to exit ClickFlash Master?",
                                    QMessageBox::Yes | QMessageBox::No);
    if (ret == QMessageBox::Yes) {
        event->accept();
    } else {
        event->ignore();
    }
}

bool MainWindow::eventFilter(QObject* obj, QEvent* event) {
    if (m_kioskMode && event->type() == QEvent::KeyPress) {
        QKeyEvent* keyEvent = static_cast<QKeyEvent*>(event);
        
        if (keyEvent->modifiers() == (Qt::ControlModifier | Qt::AltModifier | Qt::ShiftModifier) 
            && keyEvent->key() == Qt::Key_X) {
            onUnlockRequested();
            return true;
        }
        
        if (keyEvent->key() >= Qt::Key_F1 && keyEvent->key() <= Qt::Key_F12) {
            return true;
        }
        
        if (keyEvent->modifiers() & Qt::ControlModifier) {
            switch (keyEvent->key()) {
                case Qt::Key_R:
                case Qt::Key_W:
                case Qt::Key_T:
                case Qt::Key_N:
                case Qt::Key_I:
                    return true;
            }
        }
    }
    
    return QMainWindow::eventFilter(obj, event);
}

} // namespace ClickFlash
