#pragma once

#include <QWidget>
#include <QLabel>
#include <QVBoxLayout>
#include <QHBoxLayout>

namespace ClickFlash {

class StatCard : public QWidget {
    Q_OBJECT

public:
    StatCard(const QString& title, const QString& value, const QString& icon, QWidget* parent = nullptr);
    ~StatCard();

    void setValue(const QString& value);
    void setSubtitle(const QString& subtitle);
    void setTrend(double trend);

private:
    void setupUi();

    QLabel* m_iconLabel;
    QLabel* m_titleLabel;
    QLabel* m_valueLabel;
    QLabel* m_subtitleLabel;
    QLabel* m_trendLabel;
};

} // namespace ClickFlash
