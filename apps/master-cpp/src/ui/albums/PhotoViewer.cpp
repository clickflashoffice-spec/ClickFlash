#include "ui/albums/PhotoViewer.h"

namespace ClickFlash {

PhotoViewer::PhotoViewer(QWidget* parent)
    : QWidget(parent)
    , m_currentIndex(0)
    , m_zoomLevel(1.0)
{
    setupUi();
}

PhotoViewer::~PhotoViewer() {}

void PhotoViewer::setupUi() {
    setWindowTitle("Photo Viewer");
    setStyleSheet(R"(
        PhotoViewer {
            background-color: #000000;
        }
        QScrollArea {
            background-color: #000000;
            border: none;
        }
        QLabel {
            background-color: transparent;
            color: #ffffff;
        }
        QToolBar {
            background-color: rgba(0, 0, 0, 0.8);
            border: none;
        }
        QPushButton {
            background-color: transparent;
            color: #ffffff;
            border: none;
            padding: 8px;
        }
        QPushButton:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        QSlider::groove:horizontal {
            background-color: #333333;
            height: 4px;
        }
        QSlider::handle:horizontal {
            background-color: #e94560;
            width: 12px;
            margin: -4px 0;
        }
    )");
    
    setLayout(new QVBoxLayout(this));
    layout()->setContentsMargins(0, 0, 0, 0);
    
    m_toolbar = new QToolBar(this);
    m_toolbar->setMovable(false);
    
    QAction* prevAction = m_toolbar->addAction("◀ Previous");
    QAction* nextAction = m_toolbar->addAction("Next ▶");
    m_toolbar->addSeparator();
    
    QLabel* zoomLabel = new QLabel("Zoom:", this);
    m_toolbar->addWidget(zoomLabel);
    
    m_zoomSlider = new QSlider(Qt::Horizontal, this);
    m_zoomSlider->setMinimum(10);
    m_zoomSlider->setMaximum(400);
    m_zoomSlider->setValue(100);
    m_zoomSlider->setMaximumWidth(200);
    connect(m_zoomSlider, &QSlider::valueChanged, this, &PhotoViewer::onSliderChanged);
    m_toolbar->addWidget(m_zoomSlider);
    
    QLabel* zoomPercent = new QLabel("100%", this);
    m_toolbar->addWidget(zoomPercent);
    
    m_toolbar->addSeparator();
    QAction* fitAction = m_toolbar->addAction("Fit");
    QAction* actualAction = m_toolbar->addAction("100%");
    
    layout()->addWidget(m_toolbar);
    
    m_scrollArea = new QScrollArea(this);
    m_scrollArea->setAlignment(Qt::AlignCenter);
    
    m_imageLabel = new QLabel(m_scrollArea);
    m_imageLabel->setAlignment(Qt::AlignCenter);
    m_imageLabel->setText("No photo selected");
    m_imageLabel->setStyleSheet("color: #666666; font-size: 18px;");
    
    m_scrollArea->setWidget(m_imageLabel);
    m_scrollArea->setWidgetResizable(false);
    
    layout()->addWidget(m_scrollArea);
}

void PhotoViewer::openPhoto(const QString& photoId) {
    m_currentPhotoId = photoId;
    loadPhoto(photoId);
}

void PhotoViewer::openPhoto(const QVariantMap& photo) {
    m_currentPhotoId = photo.value("id").toString();
    
    QString url = photo.value("url").toString();
    QString previewUrl = photo.value("previewUrl").toString();
    
    if (!previewUrl.isEmpty()) {
        url = previewUrl;
    }
    
    m_imageLabel->setText(QString("Loading: %1").arg(url));
    
    updateNavigationButtons();
    show();
}

void PhotoViewer::close() {
    hide();
    emit closed();
}

void PhotoViewer::loadPhoto(const QString& photoId) {
    m_imageLabel->setText(QString("Loading photo: %1").arg(photoId));
    updateNavigationButtons();
}

void PhotoViewer::zoomIn() {
    m_zoomLevel *= 1.2;
    applyZoom();
}

void PhotoViewer::zoomOut() {
    m_zoomLevel /= 1.2;
    applyZoom();
}

void PhotoViewer::resetZoom() {
    m_zoomLevel = 1.0;
    applyZoom();
}

void PhotoViewer::fitToWindow() {
    m_zoomLevel = 0.5;
    applyZoom();
}

void PhotoViewer::nextPhoto() {
    if (m_currentIndex < m_photos.size() - 1) {
        m_currentIndex++;
        loadPhoto(m_photos[m_currentIndex].value("id").toString());
    }
}

void PhotoViewer::previousPhoto() {
    if (m_currentIndex > 0) {
        m_currentIndex--;
        loadPhoto(m_photos[m_currentIndex].value("id").toString());
    }
}

void PhotoViewer::toggleFullscreen() {
    if (isFullScreen()) {
        showNormal();
    } else {
        showFullScreen();
    }
}

void PhotoViewer::onSliderChanged(int value) {
    m_zoomLevel = value / 100.0;
    applyZoom();
}

void PhotoViewer::applyZoom() {
    QString text = m_imageLabel->text();
    if (text.startsWith("Loading:")) {
        return;
    }
    
    m_zoomSlider->blockSignals(true);
    m_zoomSlider->setValue(static_cast<int>(m_zoomLevel * 100));
    m_zoomSlider->blockSignals(false);
}

void PhotoViewer::updateNavigationButtons() {
    bool hasPrev = m_currentIndex > 0;
    bool hasNext = m_currentIndex < m_photos.size() - 1;
}

} // namespace ClickFlash
