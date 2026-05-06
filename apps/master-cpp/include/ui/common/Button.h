#pragma once

#include <QPushButton>
#include <QColor>

namespace ClickFlash {

class Button : public QPushButton {
    Q_OBJECT
    Q_PROPERTY(QString buttonType READ buttonType WRITE setButtonType)
    Q_PROPERTY(QColor hoverColor READ hoverColor WRITE setHoverColor)

public:
    enum Type { Primary, Secondary, Danger, Success, Ghost };
    Q_ENUM(Type)
    
    explicit Button(QWidget* parent = nullptr);
    explicit Button(const QString& text, QWidget* parent = nullptr);
    
    void setButtonType(const QString& type);
    QString buttonType() const { return m_buttonType; }
    
    void setHoverColor(const QColor& color);
    QColor hoverColor() const { return m_hoverColor; }
    
    void setIcon(const QString& iconPath);

signals:
    void clickedWithCheck();

private slots:
    void handleClick();

protected:
    void enterEvent(QEvent* event) override;
    void leaveEvent(QEvent* event) override;

private:
    void setupStyle();
    
    QString m_buttonType;
    QColor m_hoverColor;
    QString m_originalStyle;
};

} // namespace ClickFlash