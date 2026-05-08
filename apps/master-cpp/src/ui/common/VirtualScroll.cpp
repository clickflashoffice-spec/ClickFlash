#include "ui/common/VirtualScroll.h"
#include "core/Logger.h"

#include <QWheelEvent>
#include <QVBoxLayout>

namespace ClickFlash {

VirtualScroll::VirtualScroll(QWidget* parent)
    : QScrollArea(parent)
    , m_itemCount(0)
    , m_itemHeight(50)
    , m_currentIndex(-1)
    , m_multiSelect(false)
{
    setWidgetResizable(false);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    
    m_container = new QWidget(this);
    m_container->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Fixed);
    
    setWidget(m_container);
    
    setStyleSheet(R"(
        QScrollArea {
            border: none;
            background: #1a1a2e;
        }
        QScrollBar:vertical {
            background: #16213e;
            width: 10px;
            margin: 0;
        }
        QScrollBar::handle:vertical {
            background: #0f3460;
            min-height: 20px;
            border-radius: 5px;
        }
        QScrollBar::handle:vertical:hover {
            background: #e94560;
        }
    )");
}

void VirtualScroll::setItemCount(int count) {
    m_itemCount = count;
    m_selectedItems.resize(count);
    m_selectedItems.fill(false);
    
    // Update container height
    m_container->setFixedHeight(m_itemCount * m_itemHeight);
    
    // Update scroll bar
    int viewportHeight = height();
    int maxScroll = qMax(0, m_container->height() - viewportHeight);
    verticalScrollBar()->setRange(0, maxScroll);
    
    updateVisibleItems();
}

void VirtualScroll::setItemHeight(int height) {
    m_itemHeight = height;
    setItemCount(m_itemCount); // Refresh with new height
}

void VirtualScroll::setItemBuilder(std::function<QWidget*(int)> builder) {
    m_itemBuilder = builder;
}

void VirtualScroll::setItemDelegate(std::function<void(QWidget*, int)> delegate) {
    m_itemDelegate = delegate;
}

void VirtualScroll::scrollToItem(int index) {
    if (index < 0 || index >= m_itemCount) return;
    
    int scrollY = index * m_itemHeight;
    verticalScrollBar()->setValue(scrollY);
    m_currentIndex = index;
}

int VirtualScroll::currentIndex() const {
    return m_currentIndex;
}

void VirtualScroll::setSelectionMode(bool multiSelect) {
    m_multiSelect = multiSelect;
}

void VirtualScroll::setSelected(int index, bool selected) {
    if (index < 0 || index >= m_itemCount) return;
    
    if (!m_multiSelect) {
        // Single select - clear others
        for (int i = 0; i < m_selectedItems.size(); ++i) {
            m_selectedItems[i] = false;
        }
    }
    
    m_selectedItems[index] = selected;
    
    // Update visual state
    if (index >= 0 && index < m_visibleWidgets.size()) {
        QWidget* widget = m_visibleWidgets[index];
        if (widget) {
            widget->setProperty("selected", selected);
            widget->setStyleSheet(selected ? "background: #e94560;" : "");
        }
    }
    
    emit selectionChanged(selectedIndices());
}

QVector<int> VirtualScroll::selectedIndices() const {
    QVector<int> selected;
    for (int i = 0; i < m_selectedItems.size(); ++i) {
        if (m_selectedItems[i]) {
            selected.append(i);
        }
    }
    return selected;
}

void VirtualScroll::refresh() {
    updateVisibleItems();
}

void VirtualScroll::resizeEvent(QResizeEvent* event) {
    QScrollArea::resizeEvent(event);
    updateVisibleItems();
}

void VirtualScroll::scrollContentsBy(int dx, int dy) {
    QScrollArea::scrollContentsBy(dx, dy);
    updateVisibleItems();
}

void VirtualScroll::updateVisibleItems() {
    int startIdx = visibleStartIndex();
    int endIdx = visibleEndIndex();
    
    // Remove widgets no longer visible
    for (int i = m_visibleWidgets.size() - 1; i >= 0; --i) {
        int idx = m_visibleIndices[i];
        if (idx < startIdx || idx > endIdx) {
            QWidget* widget = m_visibleWidgets[i];
            widget->deleteLater();
            m_visibleWidgets.removeAt(i);
            m_visibleIndices.removeAt(i);
        }
    }
    
    // Add missing visible widgets
    for (int idx = startIdx; idx <= endIdx; ++idx) {
        if (!m_visibleIndices.contains(idx)) {
            QWidget* widget = nullptr;
            
            if (m_itemBuilder) {
                widget = m_itemBuilder(idx);
            } else {
                widget = new QWidget(m_container);
                widget->setFixedSize(width() - 20, m_itemHeight);
                widget->setStyleSheet("background: #16213e; border-bottom: 1px solid #0f3460;");
            }
            
            widget->setProperty("index", idx);
            widget->show();
            
            m_visibleWidgets.append(widget);
            m_visibleIndices.append(idx);
        }
    }
    
    // Position visible widgets
    for (int i = 0; i < m_visibleWidgets.size(); ++i) {
        int idx = m_visibleIndices[i];
        m_visibleWidgets[i]->move(10, idx * m_itemHeight);
    }
}

int VirtualScroll::visibleStartIndex() const {
    int scrollY = verticalScrollBar()->value();
    return scrollY / m_itemHeight;
}

int VirtualScroll::visibleEndIndex() const {
    int scrollY = verticalScrollBar()->value();
    int viewportHeight = height();
    return (scrollY + viewportHeight) / m_itemHeight;
}

void VirtualScroll::clearSelection() {
    for (int i = 0; i < m_selectedItems.size(); ++i) {
        m_selectedItems[i] = false;
    }
    emit selectionChanged(QVector<int>());
}

void VirtualScroll::selectAll() {
    if (!m_multiSelect) return;
    
    for (int i = 0; i < m_selectedItems.size(); ++i) {
        m_selectedItems[i] = true;
    }
    emit selectionChanged(selectedIndices());
}

} // namespace ClickFlash