#pragma once

#include <QWidget>
#include <QPainter>
#include <QVector>
#include <QColor>

namespace ClickFlash {

class Charts : public QWidget {
    Q_OBJECT

public:
    enum Type { Bar, Line, Pie, Donut };
    Q_ENUM(Type)
    
    explicit Charts(QWidget* parent = nullptr);
    
    void setChartType(Type type);
    void addDataPoint(const QString& label, double value);
    void setData(const QVector<QPair<QString, double>>& data);
    void clearData();
    
    void setBarColor(const QColor& color);
    void setShowLegend(bool show);
    void setAnimated(bool animated);

signals:
    void dataPointClicked(int index);

protected:
    void paintEvent(QPaintEvent* event) override;
    void mousePressEvent(QMouseEvent* event) override;

private:
    void drawBarChart(QPainter& painter);
    void drawLineChart(QPainter& painter);
    void drawPieChart(QPainter* painter);
    void drawDonutChart(QPainter* painter);
    
    Type m_chartType;
    QVector<QPair<QString, double>> m_data;
    QColor m_barColor;
    bool m_showLegend;
    bool m_animated;
    
    static constexpr int Padding = 40;
    static constexpr int LegendWidth = 100;
};

} // namespace ClickFlash