#include "ui/orders/OrderDetail.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QHeaderView>
#include <QMessageBox>
#include <QGroupBox>

namespace ClickFlash {

OrderDetail::OrderDetail(const QString& orderId, QWidget* parent)
    : QWidget(parent)
    , m_orderId(orderId)
    , m_subtotal(0)
    , m_tax(0)
    , m_total(0)
{
    setWindowTitle("Order Detail");
    resize(900, 700);
    
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    
    // Customer Info
    QGroupBox* customerGroup = new QGroupBox("Customer Information", this);
    QFormLayout* customerForm = new QFormLayout();
    
    m_customerName = new QLineEdit(this);
    m_customerEmail = new QLineEdit(this);
    m_customerPhone = new QLineEdit(this);
    m_status = new QComboBox(this);
    m_notes = new QTextEdit(this);
    
    m_status->addItems({"pending", "processing", "completed", "cancelled", "refunded"});
    
    customerForm->addRow("Name:", m_customerName);
    customerForm->addRow("Email:", m_customerEmail);
    customerForm->addRow("Phone:", m_customerPhone);
    customerForm->addRow("Status:", m_status);
    customerForm->addRow("Notes:", m_notes);
    
    customerGroup->setLayout(customerForm);
    mainLayout->addWidget(customerGroup);
    
    // Order Items
    QGroupBox* itemsGroup = new QGroupBox("Order Items", this);
    QVBoxLayout* itemsLayout = new QVBoxLayout();
    
    m_itemsTable = new QTableWidget(this);
    m_itemsTable->setColumnCount(5);
    m_itemsTable->setHorizontalHeaderLabels({"Product", "Quantity", "Unit Price", "Total", "Actions"});
    m_itemsTable->horizontalHeader()->setStretchLastSection(true);
    m_itemsTable->setMinimumHeight(150);
    
    QHBoxLayout* itemBtnLayout = new QHBoxLayout();
    QPushButton* addItemBtn = new QPushButton("Add Item", this);
    QPushButton* removeItemBtn = new QPushButton("Remove", this);
    
    connect(addItemBtn, &QPushButton::clicked, this, &OrderDetail::addItem);
    connect(removeItemBtn, &QPushButton::clicked, this, &OrderDetail::removeItem);
    
    itemBtnLayout->addWidget(addItemBtn);
    itemBtnLayout->addWidget(removeItemBtn);
    itemBtnLayout->addStretch();
    
    itemsLayout->addWidget(m_itemsTable);
    itemsLayout->addLayout(itemBtnLayout);
    
    itemsGroup->setLayout(itemsLayout);
    mainLayout->addWidget(itemsGroup);
    
    // Totals
    QGroupBox* totalsGroup = new QGroupBox("Totals", this);
    QFormLayout* totalsForm = new QFormLayout();
    
    m_subtotalLabel = new QLabel("$0.00", this);
    m_taxLabel = new QLabel("$0.00", this);
    m_totalLabel = new QLabel("$0.00", this);
    
    totalsForm->addRow("Subtotal:", m_subtotalLabel);
    totalsForm->addRow("Tax:", m_taxLabel);
    totalsForm->addRow("Total:", m_totalLabel);
    
    totalsGroup->setLayout(totalsForm);
    mainLayout->addWidget(totalsGroup);
    
    // Buttons
    QHBoxLayout* btnLayout = new QHBoxLayout();
    
    m_saveBtn = new QPushButton("Save", this);
    m_deleteBtn = new QPushButton("Delete Order", this);
    m_closeBtn = new QPushButton("Close", this);
    
    connect(m_saveBtn, &QPushButton::clicked, this, &OrderDetail::saveOrder);
    connect(m_deleteBtn, &QPushButton::clicked, this, &OrderDetail::deleteOrder);
    connect(m_closeBtn, &QPushButton::clicked, this, &OrderDetail::close);
    
    btnLayout->addWidget(m_saveBtn);
    btnLayout->addWidget(m_deleteBtn);
    btnLayout->addStretch();
    btnLayout->addWidget(m_closeBtn);
    
    mainLayout->addLayout(btnLayout);
    
    // Load order data
    loadOrder();
}

OrderDetail::~OrderDetail() {
}

void OrderDetail::loadOrder() {
    if (m_orderId.isEmpty()) return;
    
    auto order = DatabaseManager::instance().executeQuery(
        "SELECT * FROM orders WHERE id = :id",
        {{"id", m_orderId}}
    );
    
    if (!order.isEmpty()) {
        m_customerName->setText(order.value("customer_name").toString());
        m_customerEmail->setText(order.value("customer_email").toString());
        m_customerPhone->setText(order.value("customer_phone").toString());
        m_status->setCurrentText(order.value("status").toString());
        
        QString itemsJson = order.value("items").toString();
        // Parse items JSON and populate table
        // For now, just display raw
        m_notes->setPlainText(order.value("notes").toString());
        
        double subtotal = order.value("subtotal").toDouble();
        double tax = order.value("tax").toDouble();
        double total = order.value("total").toDouble();
        
        m_subtotalLabel->setText(QString("$%1").arg(subtotal, 0, 'f', 2));
        m_taxLabel->setText(QString("$%1").arg(tax, 0, 'f', 2));
        m_totalLabel->setText(QString("$%1").arg(total, 0, 'f', 2));
    }
}

void OrderDetail::saveOrder() {
    bool success = DatabaseManager::instance().execute(
        R"(
            UPDATE orders 
            SET customer_name = :name, customer_email = :email, customer_phone = :phone,
                status = :status, notes = :notes, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        )",
        {
            {"id", m_orderId},
            {"name", m_customerName->text()},
            {"email", m_customerEmail->text()},
            {"phone", m_customerPhone->text()},
            {"status", m_status->currentText()},
            {"notes", m_notes->toPlainText()}
        }
    );
    
    if (success) {
        CF_INFO("Order saved: {}", m_orderId.toStdString());
        QMessageBox::information(this, "Saved", "Order saved successfully.");
        emit orderUpdated(m_orderId);
    } else {
        QMessageBox::critical(this, "Error", "Failed to save order.");
    }
}

void OrderDetail::updateStatus() {
    saveOrder();
}

void OrderDetail::addItem() {
    int row = m_itemsTable->rowCount();
    m_itemsTable->insertRow(row);
    
    m_itemsTable->setItem(row, 0, new QTableWidgetItem(""));
    m_itemsTable->setItem(row, 1, new QTableWidgetItem("1"));
    m_itemsTable->setItem(row, 2, new QTableWidgetItem("0.00"));
    m_itemsTable->setItem(row, 3, new QTableWidgetItem("0.00"));
    
    calculateTotal();
}

void OrderDetail::removeItem() {
    int row = m_itemsTable->currentRow();
    if (row >= 0) {
        m_itemsTable->removeRow(row);
        calculateTotal();
    }
}

void OrderDetail::calculateTotal() {
    m_subtotal = 0;
    
    for (int row = 0; row < m_itemsTable->rowCount(); ++row) {
        QString totalStr = m_itemsTable->item(row, 3)->text();
        m_subtotal += totalStr.replace("$", "").toDouble();
    }
    
    m_tax = m_subtotal * 0.1; // 10% tax
    m_total = m_subtotal + m_tax;
    
    m_subtotalLabel->setText(QString("$%1").arg(m_subtotal, 0, 'f', 2));
    m_taxLabel->setText(QString("$%1").arg(m_tax, 0, 'f', 2));
    m_totalLabel->setText(QString("$%1").arg(m_total, 0, 'f', 2));
}

void OrderDetail::deleteOrder() {
    int ret = QMessageBox::warning(this, "Confirm Delete",
        "Are you sure you want to delete this order?", QMessageBox::Yes | QMessageBox::No);
    
    if (ret == QMessageBox::Yes) {
        bool success = DatabaseManager::instance().execute(
            "DELETE FROM orders WHERE id = :id",
            {{"id", m_orderId}}
        );
        
        if (success) {
            CF_INFO("Order deleted: {}", m_orderId.toStdString());
            emit orderDeleted(m_orderId);
            close();
        }
    }
}

void OrderDetail::close() {
    emit closeRequested();
    QWidget::close();
}

} // namespace ClickFlash