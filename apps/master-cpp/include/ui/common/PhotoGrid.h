#pragma once

#include <QWidget>
#include <QGridLayout>
#include <QScrollArea>
#include <QLabel>
#include <QVBoxLayout>

namespace ClickFlash {

class PhotoGrid : public QWidget {
    Q_OBJECT

public:
    PhotoGrid(QWidget* parent = nullptr);
    ~PhotoGrid();
    
    void setPhotos(const QVector<QVariantMap>& photos);
    void clear();
    
    int columnCount() const { return m_columnCount; }
    void setColumnCount(int count) { m_columnCount = count; }
    
    int thumbnailSize() const { return m_thumbnailSize; }
    void setThumbnailSize(int size) { m_thumbnailSize = size; }

signals:
    void photoClicked(const QString& photoId);
    void photoDoubleClicked(const QString& photoId);
    void selectionChanged(const QVector<QString>& selectedIds);

public slots:
    void setSelectionMode(bool multiSelect);

private slots:
    void onPhotoClicked(const QString& photoId);
    void onPhotoDoubleClicked(const QString& photoId);

private:
    void setupUi();
    void relayoutPhotos();
    QString getPhotoUrl(const QVariantMap& photo, const QString& type);
    
    QGridLayout* m_gridLayout;
    QScrollArea* m_scrollArea;
    QWidget* m_container;
    
    QVector<QVariantMap> m_photos;
    QSet<QString> m_selectedIds;
    
    int m_columnCount;
    int m_thumbnailSize;
    bool m_multiSelect;
};

} // namespace ClickFlash
