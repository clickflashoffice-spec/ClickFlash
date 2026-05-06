#include "ui/settings/tabs/UsersTab.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include "utils/PasswordHash.h"

#include <QUuid>
#include <QMessageBox>
#include <QGroupBox>

namespace ClickFlash {

UsersTab::UsersTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    // User form
    QGroupBox* formGroup = new QGroupBox("Add/Edit User", this);
    QFormLayout* form = new QFormLayout();
    
    m_name = new QLineEdit(this);
    m_email = new QLineEdit(this);
    m_password = new QLineEdit(this);
    m_password->setEchoMode(QLineEdit::Password);
    m_role = new QComboBox(this);
    m_active = new QCheckBox("Active", this);
    
    m_role->addItems({"Admin", "Photographer", "Editor", "Viewer"});
    m_active->setChecked(true);
    
    form->addRow("Name:", m_name);
    form->addRow("Email:", m_email);
    form->addRow("Password:", m_password);
    form->addRow("Role:", m_role);
    form->addRow("", m_active);
    
    QHBoxLayout* btnLayout = new QHBoxLayout();
    QPushButton* addBtn = new QPushButton("Add", this);
    QPushButton* editBtn = new QPushButton("Edit", this);
    QPushButton* deleteBtn = new QPushButton("Delete", this);
    
    connect(addBtn, &QPushButton::clicked, this, &UsersTab::addUser);
    connect(editBtn, &QPushButton::clicked, this, &UsersTab::editUser);
    connect(deleteBtn, &QPushButton::clicked, this, &UsersTab::deleteUser);
    
    btnLayout->addWidget(addBtn);
    btnLayout->addWidget(editBtn);
    btnLayout->addWidget(deleteBtn);
    btnLayout->addStretch();
    
    form->addRow("", btnLayout);
    formGroup->setLayout(form);
    mainLayout->addWidget(formGroup);
    
    // Users table
    m_usersTable = new QTableWidget(this);
    m_usersTable->setColumnCount(5);
    m_usersTable->setHorizontalHeaderLabels({"ID", "Name", "Email", "Role", "Active"});
    m_usersTable->horizontalHeader()->setStretchLastSection(true);
    m_usersTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    mainLayout->addWidget(m_usersTable);
    
    refreshUsers();
}

void UsersTab::addUser() {
    if (m_name->text().isEmpty() || m_email->text().isEmpty()) {
        QMessageBox::warning(this, "Validation Error", "Name and email are required.");
        return;
    }
    
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString passwordHash = PasswordHash::hash(m_password->text());
    
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
            VALUES (:id, :name, :email, :password_hash, :role, :active, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        )",
        {
            {"id", id},
            {"name", m_name->text()},
            {"email", m_email->text()},
            {"password_hash", passwordHash},
            {"role", m_role->currentText()},
            {"active", m_active->isChecked() ? 1 : 0}
        }
    );
    
    if (success) {
        CF_INFO("User added: {}", m_email->text().toStdString());
        refreshUsers();
        m_name->clear();
        m_email->clear();
        m_password->clear();
    } else {
        QMessageBox::critical(this, "Error", "Failed to add user. Email may already exist.");
    }
}

void UsersTab::editUser() {
    int row = m_usersTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Please select a user to edit.");
        return;
    }
    
    QString id = m_usersTable->item(row, 0)->text();
    
    QVariantMap params = {
        {"id", id},
        {"name", m_name->text()},
        {"email", m_email->text()},
        {"role", m_role->currentText()},
        {"active", m_active->isChecked() ? 1 : 0}
    };
    
    if (!m_password->text().isEmpty()) {
        params["password_hash"] = PasswordHash::hash(m_password->text());
        
        bool success = DatabaseManager::instance().execute(
            R"(
                UPDATE users 
                SET name = :name, email = :email, password_hash = :password_hash, role = :role, active = :active, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            )",
            params
        );
        
        if (success) {
            CF_INFO("User updated: {}", id.toStdString());
            refreshUsers();
        }
    } else {
        bool success = DatabaseManager::instance().execute(
            R"(
                UPDATE users 
                SET name = :name, email = :email, role = :role, active = :active, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            )",
            params
        );
        
        if (success) {
            CF_INFO("User updated: {}", id.toStdString());
            refreshUsers();
        }
    }
}

void UsersTab::deleteUser() {
    int row = m_usersTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Please select a user to delete.");
        return;
    }
    
    QString id = m_usersTable->item(row, 0)->text();
    
    int ret = QMessageBox::question(this, "Confirm Delete", 
        "Are you sure you want to delete this user?", QMessageBox::Yes | QMessageBox::No);
    
    if (ret == QMessageBox::Yes) {
        bool success = DatabaseManager::instance().execute(
            "DELETE FROM users WHERE id = :id",
            {{"id", id}}
        );
        
        if (success) {
            CF_INFO("User deleted: {}", id.toStdString());
            refreshUsers();
        }
    }
}

void UsersTab::refreshUsers() {
    m_usersTable->setRowCount(0);
    
    auto users = DatabaseManager::instance().executeQueryMultiple(
        "SELECT * FROM users ORDER BY name"
    );
    
    for (const auto& user : users) {
        int row = m_usersTable->rowCount();
        m_usersTable->insertRow(row);
        
        m_usersTable->setItem(row, 0, new QTableWidgetItem(user.value("id").toString()));
        m_usersTable->setItem(row, 1, new QTableWidgetItem(user.value("name").toString()));
        m_usersTable->setItem(row, 2, new QTableWidgetItem(user.value("email").toString()));
        m_usersTable->setItem(row, 3, new QTableWidgetItem(user.value("role").toString()));
        m_usersTable->setItem(row, 4, new QTableWidgetItem(user.value("active").toBool() ? "Yes" : "No"));
    }
}

} // namespace ClickFlash