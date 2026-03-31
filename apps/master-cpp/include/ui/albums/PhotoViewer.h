#pragma once

#include "ui/View.h"
#include <QLabel>
#include <QScrollArea>
#include <QToolBar>
#include <QSlider>

namespace ClickFlash {

class PhotoViewer : public QWidget {
    Q_OBJECT

public:
    explicit PhotoViewer(QWidget* parent = nullptr);
    ~PhotoViewer();
    
    void openPhoto(const QString& photoId);
    void openPhoto(const QVariantMap& photo);
    void close();

signals:
    void photoChanged(const QString& photoId);
    void closed();

public slots:
    void zoomIn();
    void zoomOut();
    void resetZoom();
    void fitToWindow();
    void nextPhoto();
    void previousPhoto();
    void toggleFullscreen();

private slots:
    void onSliderChanged(int value);

private:
    void setupUi();
    void loadPhoto(const QString& photoId);
    void updateNavigationButtons();
    
    QLabel* m_imageLabel;
    QScrollArea* m_scrollArea;
    QToolBar* m_toolbar;
    QSlider* m_zoomSlider;
    
    QVector<QVariantMap> m_photos;
    int m_currentIndex;
    double m_zoomLevel;
    QString m_currentPhotoId;
};

} // namespace ClickFlash
