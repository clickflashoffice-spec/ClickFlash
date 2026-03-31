#include "ui/NavigationSidebar.h"
#include "core/Logger.h"

namespace ClickFlash {

NavigationSidebar::NavigationSidebar(QWidget* parent)
    : QWidget(parent)
    , m_layout(new QVBoxLayout(this))
    , m_activeItem(nullptr)
    , m_bottomLayout(new QVBoxLayout())
{
    setupUi();
}

NavigationSidebar::~NavigationSidebar() {}

void NavigationSidebar::setupUi() {
    setFixedWidth(220);
    setStyleSheet(R"(
        QWidget {
            background-color: #16213e;
        }
        QPushButton {
            background-color: transparent;
            color: #a0a0a0;
            border: none;
            text-align: left;
            padding: 12px 16px;
            font-size: 14px;
        }
        QPushButton:hover {
            background-color: #1a2744;
            color: #ffffff;
        }
        QPushButton#active {
            background-color: #0f3460;
            color: #ffffff;
            border-left: 3px solid #e94560;
        }
    )");
    
    QLabel* logo = new QLabel("ClickFlash", this);
    logo->setStyleSheet(R"(
        QLabel {
            color: #ffffff;
            font-size: 20px;
            font-weight: bold;
            padding: 20px 16px;
        }
    )");
    
    m_layout->addWidget(logo);
    m_layout->addSpacing(10);
    
    addNavItem("dashboard", "Dashboard", "📊");
    addNavItem("albums", "Albums", "📁");
    addNavItem("orders", "Orders", "📦");
    addNavItem("bookings", "Bookings", "📅");
    addNavItem("photographers", "Photographers", "👤");
    
    m_layout->addStretch();
    
    QFrame* line = new QFrame(this);
    line->setFrameShape(QFrame::HLine);
    line->setStyleSheet("background-color: #2a2a4a;");
    m_layout->addWidget(line);
    
    addNavItem("settings", "Settings", "⚙️");
    
    m_layout->addLayout(m_bottomLayout);
    
    setLayout(m_layout);
}

void NavigationSidebar::addNavItem(const QString& id, const QString& text, const QString& icon) {
    QPushButton* btn = new QPushButton(icon + "  " + text, this);
    btn->setObjectName(id == "dashboard" ? "active" : "");
    btn->setProperty("viewId", id);
    
    connect(btn, &QPushButton::clicked, this, [this, id]() {
        onNavItemClicked(id);
    });
    
    m_navItems[id] = btn;
    m_layout->insertWidget(m_layout->count() - 1, btn);
    
    if (id == "dashboard") {
        m_activeItem = btn;
    }
}

void NavigationSidebar::setActiveView(const QString& viewName) {
    if (m_activeItem) {
        m_activeItem->setObjectName("");
        m_activeItem->style()->unpolish(m_activeItem);
        m_activeItem->style()->polish(m_activeItem);
    }
    
    if (m_navItems.contains(viewName)) {
        m_activeItem = m_navItems[viewName];
        m_activeItem->setObjectName("active");
        m_activeItem->style()->unpolish(m_activeItem);
        m_activeItem->style()->polish(m_activeItem);
    }
}

void NavigationSidebar::addAction(const QString& text, QObject* target, const char* member) {
    QPushButton* btn = new QPushButton(text, this);
    connect(btn, member, target, member);
    m_bottomLayout->addWidget(btn);
}

void NavigationSidebar::onNavItemClicked(const QString& viewName) {
    setActiveView(viewName);
    emit navigateRequested(viewName);
}

} // namespace ClickFlash
