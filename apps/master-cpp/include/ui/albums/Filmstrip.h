#pragma once

#include <QWidget>
#include <QScrollArea>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QList>

namespace ClickFlash {

class Filmstrip : public QWidget {
    Q_OBJECT

public:
    explicit Filmstrip(QWidget* parent = nullptr);
    
    void addThumbnail(const QString& photoId, const QString& thumbnailPath);
    void clearThumbnails();
    void setCurrentIndex(int index);
    int currentIndex() const { return m_currentIndex; }
    int count() const { return m_thumbnails.size(); }
    
signals:
    void currentChanged(int index);
    void thumbnailClicked(int index);
    void selectionChanged(const QList<int>& selectedIndices);

public slots:
    void selectAll();
    void deselectAll();
    void invertSelection();

private:
    void updateSelection();
    
    QScrollArea* m_scrollArea;
    QWidget* m_thumbnailsContainer;
    QHBoxLayout* m_thumbnailLayout;
    
    QList<QString> m_photoIds;
    QList<QLabel*> m_thumbnailLabels;
    QList<bool> m_selectionStates;
    int m_currentIndex;
    
    bool m_selectionMode;
};

} // namespace ClickFlash