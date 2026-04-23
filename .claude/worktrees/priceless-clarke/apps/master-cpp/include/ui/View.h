#pragma once

#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QFrame>

namespace ClickFlash {

class View : public QWidget {
    Q_OBJECT

public:
    explicit View(QWidget* parent = nullptr);
    virtual ~View();

    virtual void onNavigateTo() {}
    virtual void refresh() {}

protected:
    QVBoxLayout* mainLayout;
    QLabel* titleLabel;
    QWidget* contentWidget;
    QFrame* headerFrame;
    
    void setupHeader(const QString& title, bool showRefresh = true);
    void addSection(const QString& title, QWidget* widget);
    QPushButton* addActionButton(const QString& text);
    
    void applyCardStyle(QFrame* frame);
    
private:
    void setupUi();
};

} // namespace ClickFlash
