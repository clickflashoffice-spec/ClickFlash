#include "ui/common/Table.h"

namespace ClickFlash {

Table::Table(QWidget* parent)
    : QWidget(parent)
    , m_proxyModel(new QSortFilterProxyModel(this))
{
    setupUi();
}

Table::~Table() {}

void Table::setupUi() {
    setStyleSheet(R"(
        Table {
            background-color: #1a1a2e;
        }
        QTableView {
            background-color: #16213e;
            color: #ffffff;
            border: none;
            gridline-color: #2a2a4a;
            selection-background-color: #0f3460;
        }
        QTableView::item {
            padding: 8px;
            border-bottom: 1px solid #2a2a4a;
        }
        QTableView::item:selected {
            background-color: #0f3460;
        }
        QHeaderView::section {
            background-color: #1a2744;
            color: #a0a0a0;
            padding: 8px;
            border: none;
            border-bottom: 2px solid #e94560;
            font-weight: bold;
        }
        QHeaderView::section:hover {
            background-color: #243b55;
        }
    )");
    
    m_tableView = new QTableView(this);
    m_tableView->setAlternatingRowColors(true);
    m_tableView->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_tableView->setSortingEnabled(true);
    m_tableView->horizontalHeader()->setStretchLastSection(true);
    m_tableView->horizontalHeader()->setSectionResizeMode(QHeaderView::Interactive);
    m_tableView->verticalHeader()->setVisible(false);
    
    connect(m_tableView, &QTableView::clicked, this, &Table::onCellClicked);
    connect(m_tableView, &QTableView::doubleClicked, this, &Table::onCellDoubleClicked);
    
    QVBoxLayout* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->addWidget(m_tableView);
    
    setLayout(layout);
}

void Table::setColumns(const QVector<QString>& columns) {
    m_columns = columns;
}

void Table::setData(const QVector<QVariantMap>& data) {
    QStandardItemModel* model = new QStandardItemModel(data.size(), m_columns.size(), this);
    
    for (int j = 0; j < m_columns.size(); ++j) {
        model->setHeaderData(j, Qt::Horizontal, m_columns[j]);
    }
    
    for (int i = 0; i < data.size(); ++i) {
        const QVariantMap& row = data[i];
        for (int j = 0; j < m_columns.size(); ++j) {
            QStandardItem* item = new QStandardItem(row.value(m_columns[j]).toString());
            model->setItem(i, j, item);
        }
    }
    
    m_proxyModel->setSourceModel(model);
    m_tableView->setModel(m_proxyModel);
}

void Table::clear() {
    m_tableView->setModel(nullptr);
}

int Table::rowCount() const {
    return m_proxyModel->rowCount();
}

int Table::columnCount() const {
    return m_proxyModel->columnCount();
}

QVariant Table::data(int row, int col) const {
    QModelIndex index = m_proxyModel->index(row, col);
    return m_proxyModel->data(index);
}

QVariant Table::data(int row, const QString& columnName) const {
    int col = m_columns.indexOf(columnName);
    if (col >= 0) {
        return data(row, col);
    }
    return QVariant();
}

void Table::setSortingEnabled(bool enabled) {
    m_tableView->setSortingEnabled(enabled);
}

void Table::setFilteringEnabled(bool enabled) {
    m_proxyModel->setFilterKeyColumn(enabled ? -1 : 0);
}

int Table::currentRow() const {
    return m_tableView->currentIndex().row();
}

int Table::currentColumn() const {
    return m_tableView->currentIndex().column();
}

QVector<int> Table::selectedRows() const {
    QVector<int> rows;
    QModelIndexList selected = m_tableView->selectionModel()->selectedRows();
    for (const QModelIndex& index : selected) {
        rows.append(index.row());
    }
    return rows;
}

QVector<int> Table::selectedColumns() const {
    QVector<int> cols;
    QModelIndexList selected = m_tableView->selectionModel()->selectedColumns();
    for (const QModelIndex& index : selected) {
        cols.append(index.column());
    }
    return cols;
}

void Table::sortByColumn(int col, Qt::SortOrder order) {
    m_tableView->sortByColumn(col, order);
}

void Table::filter(const QString& text) {
    m_proxyModel->setFilterRegularExpression(text);
}

void Table::selectRow(int row) {
    m_tableView->selectRow(row);
}

void Table::selectAll() {
    m_tableView->selectAll();
}

void Table::onCellClicked(const QModelIndex& index) {
    emit cellClicked(index.row(), index.column());
}

void Table::onCellDoubleClicked(const QModelIndex& index) {
    emit cellDoubleClicked(index.row(), index.column());
}

} // namespace ClickFlash
