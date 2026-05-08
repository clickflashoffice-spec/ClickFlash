#pragma once

#include "ui/View.h"
#include <QWidget>
#include <QTableWidget>
#include <QPushButton>
#include <QLineEdit>
#include <QComboBox>

namespace ClickFlash {

class ClientsView : public QWidget {
    Q_OBJECT

public:
    explicit ClientsView(QWidget* parent = nullptr);

private slots:
    void refreshClients();
    void searchClients();
    void addClient();
    void editClient();
    void deleteClient();
    void viewClientOrders();

private:
    void loadClients();
    
    QTableWidget* m_clientsTable;
    QLineEdit* m_searchBox;
    QComboBox* m_filterCombo;
    QPushButton* m_refreshBtn;
    QPushButton* m_addBtn;
    QPushButton* m_editBtn;
    QPushButton* m_deleteBtn;
    QPushButton* m_viewOrdersBtn;
};

} // namespace ClickFlash