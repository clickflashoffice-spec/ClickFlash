#pragma once

#include <QScrollArea>
#include <QVector>
#include <QWidget>
#include <QRect>

namespace ClickFlash {

class VirtualScroll : public QScrollArea {
    Q_OBJECT

public:
    explicit VirtualScroll(QWidget* parent = nullptr);
    
    void setItemCount(int count);
    int itemCount() const { return m_itemCount; }
    
    void setItemHeight(int height);
    int itemHeight() const { return m_itemHeight; }
    
    void setItemBuilder(std::function<QWidget*(int)> builder);
    void setItemDelegate(std::function<void(QWidget*, int)> delegate);
    
    void scrollToItem(int index);
    int currentIndex() const { return m_currentIndex; }
    
    void setSelectionMode(bool multiSelect);
    void setSelected(int index, bool selected);
    QVector<int> selectedIndices() const;
    
    void refresh();

signals:
    void itemClicked(int index);
    void itemDoubleClicked(int index);
    void selectionChanged(const QVector<int>& selected);

public slots:
    void clearSelection();
    void selectAll();

protected:
    void resizeEvent(QResizeEvent* event) override;
    void scrollContentsBy(int dx, int dy) override;

private:
    void updateVisibleItems();
    int visibleStartIndex() const;
    int visibleEndIndex() const;
    
    int m_itemCount;
    int m_itemHeight;
    int m_currentIndex;
    
    QWidget* m_container;
    QVector<QWidget*> m_visibleWidgets;
    QVector<int> m_visibleIndices;
    QVector<bool> m_selectedItems;
    
    bool m_multiSelect;
    
    std::function<QWidget*(int)> m_itemBuilder;
    std::function<void(QWidget*, int)> m_itemDelegate;
};

} // namespace ClickFlash