#pragma once

#include <QWidget>
#include <QVBoxLayout>
#include <QLabel>
#include <QComboBox>
#include <QLineEdit>
#include <QFormLayout>

namespace ClickFlash {

class Input : public QWidget {
    Q_OBJECT

public:
    Input(const QString& label, QWidget* parent = nullptr);
    ~Input();
    
    QString text() const;
    void setText(const QString& text);
    
    void setPlaceholder(const QString& placeholder);
    void setReadOnly(bool readOnly);
    void setEnabled(bool enabled);
    
    QString value() const { return text(); }

signals:
    void textChanged(const QString& text);
    void editingFinished();

private:
    QLabel* m_label;
    QLineEdit* m_lineEdit;
};

class Select : public QWidget {
    Q_OBJECT

public:
    Select(const QString& label, QWidget* parent = nullptr);
    ~Select();
    
    QString currentText() const;
    int currentIndex() const;
    QVariant currentData() const;
    
    void addItem(const QString& text, const QVariant& data = QVariant());
    void addItems(const QStringList& items);
    void clear();
    
    void setValue(const QString& value);
    void setValue(int value);

signals:
    void currentIndexChanged(int index);
    void currentTextChanged(const QString& text);

private:
    QLabel* m_label;
    QComboBox* m_comboBox;
};

} // namespace ClickFlash
