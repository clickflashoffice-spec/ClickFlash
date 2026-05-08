#pragma once

#include <QWidget>
#include <QTableWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QFormLayout>
#include <QLineEdit>
#include <QDoubleSpinBox>
#include <QComboBox>
#include <QCheckBox>

namespace ClickFlash {

class ProductsTab : public QWidget {
    Q_OBJECT

public:
    explicit ProductsTab(QWidget* parent = nullptr);

private slots:
    void addProduct();
    void editProduct();
    void deleteProduct();
    void refreshProducts();

private:
    QTableWidget* m_productsTable;
    QLineEdit* m_name;
    QLineEdit* m_description;
    QComboBox* m_type;
    QDoubleSpinBox* m_price;
    QLineEdit* m_sku;
    QCheckBox* m_active;
};

} // namespace ClickFlash