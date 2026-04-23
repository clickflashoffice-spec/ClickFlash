#pragma once

#include <QWidget>
#include <QDialog>
#include <QVBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QHBoxLayout>

namespace ClickFlash {

class Modal : public QDialog {
    Q_OBJECT

public:
    Modal(const QString& title, QWidget* parent = nullptr);
    ~Modal();
    
    void setContent(QWidget* widget);
    void setMessage(const QString& message);
    
    QPushButton* addButton(const QString& text);
    
    int result() const { return m_result; }
    
    static int confirm(const QString& title, const QString& message, QWidget* parent = nullptr);
    static void info(const QString& title, const QString& message, QWidget* parent = nullptr);
    static void warning(const QString& title, const QString& message, QWidget* parent = nullptr);
    static bool question(const QString& title, const QString& message, QWidget* parent = nullptr);

private slots:
    void onButtonClicked();

private:
    void setupUi(const QString& title);
    
    QVBoxLayout* m_contentLayout;
    QHBoxLayout* m_buttonLayout;
    QVector<QPushButton*> m_buttons;
    int m_result;
};

} // namespace ClickFlash
