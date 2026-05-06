#pragma once

#include <QWidget>
#include <QTableWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QFormLayout>
#include <QLineEdit>
#include <QComboBox>
#include <QCheckBox>
#include <QPasswordLineEdit>

namespace ClickFlash {

class UsersTab : public QWidget {
    Q_OBJECT

public:
    explicit UsersTab(QWidget* parent = nullptr);

private slots:
    void addUser();
    void editUser();
    void deleteUser();
    void refreshUsers();

private:
    QTableWidget* m_usersTable;
    QLineEdit* m_name;
    QLineEdit* m_email;
    QLineEdit* m_password;
    QComboBox* m_role;
    QCheckBox* m_active;
};

} // namespace ClickFlash