#pragma once

#include <QComboBox>
#include <QListView>
#include <QStringListModel>

namespace ClickFlash {

class Select : public QComboBox {
    Q_OBJECT

public:
    explicit Select(QWidget* parent = nullptr);
    
    void addOption(const QString& value, const QString& label = "");
    void addOptions(const QStringList& options);
    void clearOptions();
    void setSelectedValue(const QString& value);
    QString selectedValue() const;
    QString selectedLabel() const;
    
    void setSearchable(bool searchable);
    void setMultiSelect(bool multiSelect);

signals:
    void valueChanged(const QString& value);
    void selectionChanged(const QStringList& values);

private slots:
    void handleCurrentIndexChanged(int index);

private:
    QStringList m_values;
    bool m_multiSelect;
};

} // namespace ClickFlash