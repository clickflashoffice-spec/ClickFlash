#include "ui/settings/tabs/ProductsTab.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

#include <QUuid>
#include <QMessageBox>
#include <QGroupBox>

namespace ClickFlash {

ProductsTab::ProductsTab(QWidget* parent)
    : QWidget(parent)
{
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    // Product form
    QGroupBox* formGroup = new QGroupBox("Add/Edit Product", this);
    QFormLayout* form = new QFormLayout();
    
    m_name = new QLineEdit(this);
    m_description = new QLineEdit(this);
    m_type = new QComboBox(this);
    m_price = new QDoubleSpinBox(this);
    m_sku = new QLineEdit(this);
    m_active = new QCheckBox("Active", this);
    
    m_type->addItems({"print", "digital", "package", "album", "frame", "other"});
    m_price->setRange(0, 999999);
    m_price->setPrefix("$ ");
    m_price->setDecimals(2);
    m_active->setChecked(true);
    
    form->addRow("Name:", m_name);
    form->addRow("Description:", m_description);
    form->addRow("Type:", m_type);
    form->addRow("Price:", m_price);
    form->addRow("SKU:", m_sku);
    form->addRow("", m_active);
    
    QHBoxLayout* btnLayout = new QHBoxLayout();
    QPushButton* addBtn = new QPushButton("Add", this);
    QPushButton* editBtn = new QPushButton("Edit", this);
    QPushButton* deleteBtn = new QPushButton("Delete", this);
    
    connect(addBtn, &QPushButton::clicked, this, &ProductsTab::addProduct);
    connect(editBtn, &QPushButton::clicked, this, &ProductsTab::editProduct);
    connect(deleteBtn, &QPushButton::clicked, this, &ProductsTab::deleteProduct);
    
    btnLayout->addWidget(addBtn);
    btnLayout->addWidget(editBtn);
    btnLayout->addWidget(deleteBtn);
    btnLayout->addStretch();
    
    form->addRow("", btnLayout);
    formGroup->setLayout(form);
    mainLayout->addWidget(formGroup);
    
    // Products table
    m_productsTable = new QTableWidget(this);
    m_productsTable->setColumnCount(6);
    m_productsTable->setHorizontalHeaderLabels({"ID", "Name", "Type", "Price", "SKU", "Active"});
    m_productsTable->horizontalHeader()->setStretchLastSection(true);
    m_productsTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    mainLayout->addWidget(m_productsTable);
    
    refreshProducts();
}

void ProductsTab::addProduct() {
    if (m_name->text().isEmpty()) {
        QMessageBox::warning(this, "Validation Error", "Product name is required.");
        return;
    }
    
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    bool success = DatabaseManager::instance().execute(
        R"(
            INSERT INTO products (id, name, description, type, price, sku, active, created_at)
            VALUES (:id, :name, :description, :type, :price, :sku, :active, CURRENT_TIMESTAMP)
        )",
        {
            {"id", id},
            {"name", m_name->text()},
            {"description", m_description->text()},
            {"type", m_type->currentText()},
            {"price", m_price->value()},
            {"sku", m_sku->text()},
            {"active", m_active->isChecked() ? 1 : 0}
        }
    );
    
    if (success) {
        CF_INFO("Product added: {}", m_name->text().toStdString());
        refreshProducts();
        // Clear form
        m_name->clear();
        m_description->clear();
        m_price->setValue(0);
        m_sku->clear();
    } else {
        QMessageBox::critical(this, "Error", "Failed to add product.");
    }
}

void ProductsTab::editProduct() {
    int row = m_productsTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Please select a product to edit.");
        return;
    }
    
    QString id = m_productsTable->item(row, 0)->text();
    
    bool success = DatabaseManager::instance().execute(
        R"(
            UPDATE products 
            SET name = :name, description = :description, type = :type, price = :price, sku = :sku, active = :active
            WHERE id = :id
        )",
        {
            {"id", id},
            {"name", m_name->text()},
            {"description", m_description->text()},
            {"type", m_type->currentText()},
            {"price", m_price->value()},
            {"sku", m_sku->text()},
            {"active", m_active->isChecked() ? 1 : 0}
        }
    );
    
    if (success) {
        CF_INFO("Product updated: {}", id.toStdString());
        refreshProducts();
    } else {
        QMessageBox::critical(this, "Error", "Failed to update product.");
    }
}

void ProductsTab::deleteProduct() {
    int row = m_productsTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Please select a product to delete.");
        return;
    }
    
    QString id = m_productsTable->item(row, 0)->text();
    
    int ret = QMessageBox::question(this, "Confirm Delete", 
        "Are you sure you want to delete this product?", QMessageBox::Yes | QMessageBox::No);
    
    if (ret == QMessageBox::Yes) {
        bool success = DatabaseManager::instance().execute(
            "DELETE FROM products WHERE id = :id",
            {{"id", id}}
        );
        
        if (success) {
            CF_INFO("Product deleted: {}", id.toStdString());
            refreshProducts();
        }
    }
}

void ProductsTab::refreshProducts() {
    m_productsTable->setRowCount(0);
    
    auto products = DatabaseManager::instance().executeQueryMultiple(
        "SELECT * FROM products ORDER BY name"
    );
    
    for (const auto& product : products) {
        int row = m_productsTable->rowCount();
        m_productsTable->insertRow(row);
        
        m_productsTable->setItem(row, 0, new QTableWidgetItem(product.value("id").toString()));
        m_productsTable->setItem(row, 1, new QTableWidgetItem(product.value("name").toString()));
        m_productsTable->setItem(row, 2, new QTableWidgetItem(product.value("type").toString()));
        m_productsTable->setItem(row, 3, new QTableWidgetItem(QString("$%1").arg(product.value("price").toDouble(), 0, 'f', 2)));
        m_productsTable->setItem(row, 4, new QTableWidgetItem(product.value("sku").toString()));
        m_productsTable->setItem(row, 5, new QTableWidgetItem(product.value("active").toBool() ? "Yes" : "No"));
    }
}

} // namespace ClickFlash