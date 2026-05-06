#include "ui/common/Charts.h"
#include "core/Logger.h"

#include <QPainter>
#include <QMouseEvent>
#include <QtMath>

namespace ClickFlash {

Charts::Charts(QWidget* parent)
    : QWidget(parent)
    , m_chartType(Bar)
    , m_barColor("#e94560")
    , m_showLegend(true)
    , m_animated(true)
{
    setMinimumSize(300, 200);
    setStyleSheet("background: transparent;");
}

void Charts::setChartType(Type type) {
    m_chartType = type;
    update();
}

void Charts::addDataPoint(const QString& label, double value) {
    m_data.append(qMakePair(label, value));
    update();
}

void Charts::setData(const QVector<QPair<QString, double>>& data) {
    m_data = data;
    update();
}

void Charts::clearData() {
    m_data.clear();
    update();
}

void Charts::setBarColor(const QColor& color) {
    m_barColor = color;
    update();
}

void Charts::setShowLegend(bool show) {
    m_showLegend = show;
    update();
}

void Charts::setAnimated(bool animated) {
    m_animated = animated;
}

void Charts::paintEvent(QPaintEvent* event) {
    QWidget::paintEvent(event);
    
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing);
    
    if (m_data.isEmpty()) {
        painter.drawText(rect(), Qt::AlignCenter, "No data");
        return;
    }
    
    switch (m_chartType) {
        case Bar: drawBarChart(painter); break;
        case Line: drawLineChart(painter); break;
        case Pie: drawPieChart(&painter); break;
        case Donut: drawDonutChart(&painter); break;
    }
}

void Charts::drawBarChart(QPainter& painter) {
    int chartWidth = m_showLegend ? width() - LegendWidth : width();
    int chartHeight = height() - 2 * Padding;
    
    double maxValue = 0;
    for (const auto& point : m_data) {
        if (point.second > maxValue) maxValue = point.second;
    }
    if (maxValue == 0) maxValue = 1;
    
    int barWidth = (chartWidth - Padding * 2) / m_data.size() - 10;
    int x = Padding;
    
    QVector<QColor> colors = {#e94560, #4ecca3, #45b7d1, #f9ca24, #a55eea};
    
    for (int i = 0; i < m_data.size(); ++i) {
        double barHeight = (m_data[i].second / maxValue) * chartHeight;
        int y = height() - Padding - barHeight;
        
        painter.setBrush(colors[i % colors.size()]);
        painter.setPen(Qt::NoPen);
        painter.drawRect(x, y, barWidth, barHeight);
        
        // Label
        painter.setPen(Qt::white);
        painter.drawText(x + barWidth/2 - 20, height() - Padding + 15, m_data[i].first);
        
        x += barWidth + 10;
    }
}

void Charts::drawLineChart(QPainter& painter) {
    int chartWidth = m_showLegend ? width() - LegendWidth : width();
    int chartHeight = height() - 2 * Padding;
    
    double maxValue = 0;
    double minValue = 0;
    for (const auto& point : m_data) {
        if (point.second > maxValue) maxValue = point.second;
        if (point.second < minValue) minValue = point.second;
    }
    if (maxValue == minValue) { maxValue += 1; minValue -= 1; }
    
    double range = maxValue - minValue;
    int stepX = (chartWidth - Padding * 2) / (m_data.size() > 1 ? m_data.size() - 1 : 1);
    
    QPen linePen(m_barColor, 2);
    painter.setPen(linePen);
    painter.setBrush(Qt::NoBrush);
    
    QPolygon points;
    for (int i = 0; i < m_data.size(); ++i) {
        int x = Padding + i * stepX;
        int y = height() - Padding - ((m_data[i].second - minValue) / range) * chartHeight;
        points.append(QPoint(x, y));
    }
    
    painter.drawPolyline(points);
    
    // Draw points
    painter.setBrush(m_barColor);
    for (const QPoint& pt : points) {
        painter.drawEllipse(pt, 4, 4);
    }
}

void Charts::drawPieChart(QPainter* painter) {
    double total = 0;
    for (const auto& point : m_data) {
        total += point.second;
    }
    if (total == 0) return;
    
    int size = qMin(width(), height()) - 40;
    int x = (width() - size) / 2;
    int y = (height() - size) / 2;
    
    QRect pieRect(x, y, size, size);
    
    double startAngle = 0;
    QVector<QColor> colors = {#e94560, #4ecca3, #45b7d1, #f9ca24, #a55eea};
    
    for (int i = 0; i < m_data.size(); ++i) {
        double spanAngle = (m_data[i].second / total) * 360;
        painter->setBrush(colors[i % colors.size()]);
        painter->setPen(Qt::NoPen);
        painter->drawPie(pieRect, startAngle * 16, spanAngle * 16);
        startAngle += spanAngle;
    }
}

void Charts::drawDonutChart(QPainter* painter) {
    double total = 0;
    for (const auto& point : m_data) {
        total += point.second;
    }
    if (total == 0) return;
    
    int size = qMin(width(), height()) - 40;
    int outerSize = size;
    int innerSize = size * 0.6;
    int x = (width() - outerSize) / 2;
    int y = (height() - outerSize) / 2;
    
    double startAngle = 0;
    QVector<QColor> colors = {#e94560, #4ecca3, #45b7d1, #f9ca24, #a55eea};
    
    for (int i = 0; i < m_data.size(); ++i) {
        double spanAngle = (m_data[i].second / total) * 360;
        painter->setBrush(colors[i % colors.size()]);
        painter->setPen(Qt::NoPen);
        
        // Draw outer arc
        painter->drawPie(x, y, outerSize, outerSize, startAngle * 16, spanAngle * 16);
        
        // Draw inner circle to create donut hole
        painter->setBrush(QColor("#1a1a2e"));
        painter->drawEllipse(x + (outerSize - innerSize)/2, y + (outerSize - innerSize)/2, innerSize, innerSize);
        
        startAngle += spanAngle;
    }
}

void Charts::mousePressEvent(QMouseEvent* event) {
    int index = event->x() / (width() / m_data.size());
    if (index >= 0 && index < m_data.size()) {
        emit dataPointClicked(index);
    }
}

} // namespace ClickFlash