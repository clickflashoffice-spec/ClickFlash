#pragma once

#include <QWidget>
#include <QMap>
#include <QString>
#include <QAction>
#include <QLabel>
#include <QVBoxLayout>
#include <QPushButton>

namespace ClickFlash {

class NavigationSidebar : public QWidget {
    Q_OBJECT

public:
    explicit NavigationSidebar(QWidget* parent = nullptr);
    ~NavigationSidebar();

    void setActiveView(const QString& viewName);
    void addAction(const QString& text, QObject* target, const char* member);

signals:
    void navigateRequested(const QString& viewName);

public slots:
    void onNavItemClicked(const QString& viewName);

private:
    void setupUi();
    void addNavItem(const QString& id, const QString& text, const QString& icon);

    QVBoxLayout* m_layout;
    QMap<QString, QPushButton*> m_navItems;
    QPushButton* m_activeItem;
    QVBoxLayout* m_bottomLayout;
};

} // namespace ClickFlash
