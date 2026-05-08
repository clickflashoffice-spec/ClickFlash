#pragma once

#include <QWidget>
#include <QLabel>
#include <QLineEdit>
#include <QTextEdit>
#include <QComboBox>
#include <QPushButton>
#include <QTableWidget>

namespace ClickFlash {

class OrderDetail : public QWidget {
    Q_OBJECT

public:
    explicit OrderDetail(const QString& orderId, QWidget* parent = nullptr);
    ~OrderDetail();

signals:
    void orderUpdated(const QString& orderId);
    void orderDeleted(const QString& orderId);
    void closeRequested();

private slots:
    void saveOrder();
    void updateStatus();
    void addItem();
    void removeItem();
    void calculateTotal();
    void deleteOrder();
    void close();

private:
    void loadOrder();
    
    QString m_orderId;
    
    QLineEdit* m_customerName;
    QLineEdit* m_customerEmail;
    QLineEdit* m_customerPhone;
    QComboBox* m_status;
    QTextEdit* m_notes;
    
    QTableWidget* m_itemsTable;
    QLabel* m_subtotalLabel;
    QLabel* m_taxLabel;
    QLabel* m_totalLabel;
    
    QPushButton* m_saveBtn;
    QPushButton* m_deleteBtn;
    QPushButton* m_closeBtn;
    
    double m_subtotal;
    double m_tax;
    double m_total;
};

} // namespace ClickFlash