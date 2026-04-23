#pragma once

#include <QWidget>
#include <QTableView>
#include <QSortFilterProxyModel>
#include <QJsonObject>
#include <QHeaderView>

namespace ClickFlash {

class Table : public QWidget {
    Q_OBJECT

public:
    Table(QWidget* parent = nullptr);
    ~Table();
    
    void setColumns(const QVector<QString>& columns);
    void setData(const QVector<QVariantMap>& data);
    void clear();
    
    int rowCount() const;
    int columnCount() const;
    
    QVariant data(int row, int col) const;
    QVariant data(int row, const QString& columnName) const;
    
    void setSortingEnabled(bool enabled);
    void setFilteringEnabled(bool enabled);
    
    int currentRow() const;
    int currentColumn() const;
    
    QVector<int> selectedRows() const;
    QVector<int> selectedColumns() const;

signals:
    void cellClicked(int row, int col);
    void cellDoubleClicked(int row, int col);
    void currentCellChanged(int row, int col);
    void selectionChanged();

public slots:
    void sortByColumn(int col, Qt::SortOrder order = Qt::AscendingOrder);
    void filter(const QString& text);
    void selectRow(int row);
    void selectAll();

private slots:
    void onCellClicked(const QModelIndex& index);
    void onCellDoubleClicked(const QModelIndex& index);

private:
    void setupUi();
    
    QTableView* m_tableView;
    QSortFilterProxyModel* m_proxyModel;
    QStringList m_columns;
};

} // namespace ClickFlash
