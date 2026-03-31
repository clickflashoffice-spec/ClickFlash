#include "ui/common/StatCard.h"

namespace ClickFlash {

StatCard::StatCard(const QString& title, const QString& value, const QString& icon, QWidget* parent)
    : QWidget(parent)
{
    setupUi();
    
    m_iconLabel->setText(icon);
    m_titleLabel->setText(title.toUpper());
    m_valueLabel->setText(value);
}

StatCard::~StatCard() {}

void StatCard::setupUi() {
    setMinimumSize(200, 120);
    setStyleSheet(R"(
        StatCard {
            background-color: #16213e;
            border-radius: 8px;
            padding: 16px;
        }
    )");
    
    QVBoxLayout* layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 16, 16, 16);
    layout->setSpacing(8);
    
    m_iconLabel = new QLabel(this);
    m_iconLabel->setStyleSheet("font-size: 24px;");
    
    m_titleLabel = new QLabel(this);
    m_titleLabel->setStyleSheet("color: #a0a0a0; font-size: 12px; font-weight: bold; letter-spacing: 1px;");
    
    m_valueLabel = new QLabel(this);
    m_valueLabel->setStyleSheet("color: #ffffff; font-size: 28px; font-weight: bold;");
    
    m_subtitleLabel = new QLabel(this);
    m_subtitleLabel->setStyleSheet("color: #a0a0a0; font-size: 12px;");
    
    m_trendLabel = new QLabel(this);
    m_trendLabel->setStyleSheet("color: #4ade80; font-size: 12px;");
    
    layout->addWidget(m_iconLabel, 0, Qt::AlignTop | Qt::AlignLeft);
    layout->addWidget(m_titleLabel);
    layout->addWidget(m_valueLabel);
    layout->addWidget(m_subtitleLabel, 0, Qt::AlignBottom);
    layout->addWidget(m_trendLabel, 0, Qt::AlignBottom);
    
    setLayout(layout);
}

void StatCard::setValue(const QString& value) {
    m_valueLabel->setText(value);
}

void StatCard::setSubtitle(const QString& subtitle) {
    m_subtitleLabel->setText(subtitle);
}

void StatCard::setTrend(double trend) {
    if (trend > 0) {
        m_trendLabel->setText(QString("↑ %1%").arg(trend, 0, 'f', 1));
        m_trendLabel->setStyleSheet("color: #4ade80; font-size: 12px;");
    } else if (trend < 0) {
        m_trendLabel->setText(QString("↓ %1%").arg(qAbs(trend), 0, 'f', 1));
        m_trendLabel->setStyleSheet("color: #f87171; font-size: 12px;");
    } else {
        m_trendLabel->setText("No change");
        m_trendLabel->setStyleSheet("color: #a0a0a0; font-size: 12px;");
    }
}

} // namespace ClickFlash
