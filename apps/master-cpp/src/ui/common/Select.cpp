#include "ui/common/Select.h"
#include "core/Logger.h"

namespace ClickFlash {

Select::Select(QWidget* parent)
    : QComboBox(parent)
    , m_multiSelect(false)
{
    setStyleSheet(R"(
        QComboBox {
            background-color: #16213e;
            color: #e0e0e0;
            border: 1px solid #0f3460;
            border-radius: 4px;
            padding: 6px 12px;
            min-height: 20px;
        }
        QComboBox:hover {
            border-color: #e94560;
        }
        QComboBox:focus {
            border-color: #e94560;
        }
        QComboBox::drop-down {
            border: none;
            width: 30px;
        }
        QComboBox::down-arrow {
            image: none;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid #e0e0e0;
        }
        QComboBox QAbstractItemView {
            background-color: #16213e;
            color: #e0e0e0;
            border: 1px solid #0f3460;
            selection-background-color: #e94560;
            selection-color: white;
        }
    )");
    
    connect(this, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &Select::handleCurrentIndexChanged);
}

void Select::addOption(const QString& value, const QString& label) {
    QString displayText = label.isEmpty() ? value : label;
    m_values.append(value);
    addItem(displayText);
}

void Select::addOptions(const QStringList& options) {
    for (const QString& option : options) {
        addOption(option);
    }
}

void Select::clearOptions() {
    clear();
    m_values.clear();
}

void Select::setSelectedValue(const QString& value) {
    int index = m_values.indexOf(value);
    if (index >= 0) {
        setCurrentIndex(index);
    }
}

QString Select::selectedValue() const {
    int index = currentIndex();
    if (index >= 0 && index < m_values.size()) {
        return m_values[index];
    }
    return QString();
}

QString Select::selectedLabel() const {
    return currentText();
}

void Select::setSearchable(bool searchable) {
    // Could implement with QCompleter for searchable dropdown
    CF_DEBUG("Select searchable: {}", searchable);
}

void Select::setMultiSelect(bool multiSelect) {
    m_multiSelect = multiSelect;
    // Would change view mode for multi-select
    CF_DEBUG("Select multiSelect: {}", multiSelect);
}

void Select::handleCurrentIndexChanged(int index) {
    if (index >= 0 && index < m_values.size()) {
        emit valueChanged(m_values[index]);
    }
}

} // namespace ClickFlash