#include "ui/clients/ClientsView.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QMessageBox>
#include <QInputDialog>
#include <QUuid>

namespace ClickFlash {

ClientsView::ClientsView(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    // Toolbar
    QWidget* toolbar = new QWidget(this);
    QHBoxLayout* toolbarLayout = new QHBoxLayout(toolbar);
    
    m_searchBox = new QLineEdit(this);
    m_searchBox->setPlaceholderText("Search clients...");
    
    m_filterCombo = new QComboBox(this);
    m_filterCombo->addItems({"All", "Active", "Inactive"});
    
    m_refreshBtn = new QPushButton("Refresh", this);
    m_addBtn = new QPushButton("Add Client", this);
    m_editBtn = new QPushButton("Edit", this);
    m_deleteBtn = new QPushButton("Delete", this);
    m_viewOrdersBtn = new QPushButton("View Orders", this);
    
    connect(m_searchBox, &QLineEdit::returnPressed, this, &ClientsView::searchClients);
    connect(m_refreshBtn, &QPushButton::clicked, this, &ClientsView::refreshClients);
    connect(m_addBtn, &QPushButton::clicked, this, &ClientsView::addClient);
    connect(m_editBtn, &QPushButton::clicked, this, &ClientsView::editClient);
    connect(m_deleteBtn, &QPushButton::clicked, this, &ClientsView::deleteClient);
    connect(m_viewOrdersBtn, &QPushButton::clicked, this, &ClientsView::viewClientOrders);
    
    toolbarLayout->addWidget(m_searchBox);
    toolbarLayout->addWidget(m_filterCombo);
    toolbarLayout->addStretch();
    toolbarLayout->addWidget(m_refreshBtn);
    toolbarLayout->addWidget(m_addBtn);
    toolbarLayout->addWidget(m_editBtn);
    toolbarLayout->addWidget(m_deleteBtn);
    toolbarLayout->addWidget(m_viewOrdersBtn);
    
    mainLayout->addWidget(toolbar);
    
    // Clients table
    m_clientsTable = new QTableWidget(this);
    m_clientsTable->setColumnCount(6);
    m_clientsTable->setHorizontalHeaderLabels({"ID", "Name", "Email", "Phone", "Total Orders", "Total Spent"});
    m_clientsTable->horizontalHeader()->setStretchLastSection(true);
    m_clientsTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_clientsTable->setSelectionMode(QAbstractItemView::SingleSelection);
    m_clientsTable->setEditTriggers(QAbstractItemView::NoEditTriggers);
    
    mainLayout->addWidget(m_clientsTable);
    
    loadClients();
}

void ClientsView::loadClients() {
    m_clientsTable->setRowCount(0);
    
    QString searchText = m_searchBox->text();
    QString filter = m_filterCombo->currentText();
    
    // Get clients from users who have placed orders
    QString query = R"(
        SELECT u.id, u.name, u.email, u.phone, u.active,
            COUNT(o.id) as order_count,
            COALESCE(SUM(o.total), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.name = o.customer_name
        WHERE u.role IN ('Client', 'Customer') OR u.id IN (
            SELECT DISTINCT customer_name FROM orders WHERE customer_name IS NOT NULL
        )
    )";
    
    QVariantMap params;
    
    if (!searchText.isEmpty()) {
        query += " AND (u.name LIKE :search OR u.email LIKE :search)";
        params["search"] = "%" + searchText + "%";
    }
    
    if (filter == "Active") {
        query += " AND u.active = 1";
    } else if (filter == "Inactive") {
        query += " AND u.active = 0";
    }
    
    query += " GROUP BY u.id ORDER BY total_spent DESC";
    
    auto clients = DatabaseManager::instance().executeQueryMultiple(query, params);
    
    for (const auto& client : clients) {
        int row = m_clientsTable->rowCount();
        m_clientsTable->insertRow(row);
        
        m_clientsTable->setItem(row, 0, new QTableWidgetItem(client.value("id").toString().left(8)));
        m_clientsTable->setItem(row, 1, new QTableWidgetItem(client.value("name").toString()));
        m_clientsTable->setItem(row, 2, new QTableWidgetItem(client.value("email").toString()));
        m_clientsTable->setItem(row, 3, new QTableWidgetItem(client.value("phone").toString()));
        m_clientsTable->setItem(row, 4, new QTableWidgetItem(client.value("order_count").toString()));
        m_clientsTable->setItem(row, 5, new QTableWidgetItem(QString("$%1").arg(client.value("total_spent").toDouble(), 0, 'f', 2)));
    }
    
    CF_DEBUG("Loaded {} clients", clients.size());
}

void ClientsView::refreshClients() {
    loadClients();
}

void ClientsView::searchClients() {
    loadClients();
}

void ClientsView::addClient() {
    bool ok;
    QString name = QInputDialog::getText(this, "Add Client", "Name:", QLineEdit::Normal, "", &ok);
    if (!ok || name.isEmpty()) return;
    
    QString email = QInputDialog::getText(this, "Add Client", "Email:", QLineEdit::Normal, "", &ok);
    
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO users (id, name, email, role, active, created_at, updated_at)
            VALUES (:id, :name, :email, 'Client', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        )",
        {
            {"id", id},
            {"name", name},
            {"email", email}
        }
    );
    
    if (success) {
        CF_INFO("Client added: {}", name.toStdString());
        loadClients();
    } else {
        QMessageBox::critical(this, "Error", "Failed to add client.");
    }
}

void ClientsView::editClient() {
    int row = m_clientsTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Select a client to edit.");
        return;
    }
    
    QString id = m_clientsTable->item(row, 0)->text();
    QString currentName = m_clientsTable->item(row, 1)->text();
    
    bool ok;
    QString newName = QInputDialog::getText(this, "Edit Client", "Name:", QLineEdit::Normal, currentName, &ok);
    if (!ok) return;
    
    bool success = DatabaseManager::instance().execute(
        "UPDATE users SET name = :name, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
        {{"name", newName}, {"id", id}}
    );
    
    if (success) {
        CF_INFO("Client updated: {}", id.toStdString());
        loadClients();
    }
}

void ClientsView::deleteClient() {
    int row = m_clientsTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Select a client to delete.");
        return;
    }
    
    QString id = m_clientsTable->item(row, 0)->text();
    
    int ret = QMessageBox::question(this, "Confirm Delete",
        "Are you sure you want to delete this client?", QMessageBox::Yes | QMessageBox::No);
    
    if (ret == QMessageBox::Yes) {
        bool success = DatabaseManager::instance().execute(
            "DELETE FROM users WHERE id = :id",
            {{"id", id}}
        );
        
        if (success) {
            CF_INFO("Client deleted: {}", id.toStdString());
            loadClients();
        }
    }
}

void ClientsView::viewClientOrders() {
    int row = m_clientsTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Select a client to view orders.");
        return;
    }
    
    QString name = m_clientsTable->item(row, 1)->text();
    CF_INFO("Viewing orders for: {}", name.toStdString());
    
    QMessageBox::information(this, "Client Orders", "Orders view for: " + name);
}

} // namespace ClickFlash