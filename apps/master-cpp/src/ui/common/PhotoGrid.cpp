#include "ui/common/PhotoGrid.h"

namespace ClickFlash {

PhotoGrid::PhotoGrid(QWidget* parent)
    : QWidget(parent)
    , m_columnCount(4)
    , m_thumbnailSize(200)
    , m_multiSelect(false)
{
    setupUi();
}

PhotoGrid::~PhotoGrid() {}

void PhotoGrid::setupUi() {
    setStyleSheet(R"(
        PhotoGrid {
            background-color: #1a1a2e;
        }
        QLabel {
            background-color: #16213e;
            border-radius: 4px;
            padding: 4px;
        }
    )");
    
    m_scrollArea = new QScrollArea(this);
    m_scrollArea->setWidgetResizable(true);
    m_scrollArea->setStyleSheet("border: none;");
    
    m_container = new QWidget(m_scrollArea);
    m_gridLayout = new QGridLayout(m_container);
    m_gridLayout->setSpacing(8);
    m_gridLayout->setContentsMargins(0, 0, 0, 0);
    
    m_container->setLayout(m_gridLayout);
    m_scrollArea->setWidget(m_container);
    
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->addWidget(m_scrollArea);
    
    setLayout(mainLayout);
}

void PhotoGrid::setPhotos(const QVector<QVariantMap>& photos) {
    m_photos = photos;
    relayoutPhotos();
}

void PhotoGrid::clear() {
    QLayoutItem* item;
    while ((item = m_gridLayout->takeAt(0)) != nullptr) {
        delete item->widget();
        delete item;
    }
    m_photos.clear();
    m_selectedIds.clear();
}

void PhotoGrid::relayoutPhotos() {
    clear();
    
    int row = 0;
    int col = 0;
    
    for (const QVariantMap& photo : m_photos) {
        QString photoId = photo.value("id").toString();
        
        QLabel* thumbnail = new QLabel(m_container);
        thumbnail->setFixedSize(m_thumbnailSize, m_thumbnailSize);
        thumbnail->setScaledContents(true);
        thumbnail->setStyleSheet(R"(
            QLabel {
                background-color: #16213e;
                border-radius: 4px;
                border: 2px solid transparent;
            }
            QLabel:hover {
                border-color: #e94560;
            }
            QLabel:selected {
                border-color: #4ade80;
            }
        )");
        
        QString thumbnailUrl = getPhotoUrl(photo, "thumbnail");
        if (!thumbnailUrl.isEmpty()) {
            thumbnail->setText(QString("<img src='%1' width='%2' height='%3'/>")
                .arg(thumbnailUrl).arg(m_thumbnailSize).arg(m_thumbnailSize));
        } else {
            thumbnail->setText("📷");
            thumbnail->setAlignment(Qt::AlignCenter);
        }
        
        thumbnail->setProperty("photoId", photoId);
        thumbnail->setCursor(Qt::PointingHandCursor);
        
        connect(thumbnail, &QLabel::clicked, this, [this, photoId]() {
            onPhotoClicked(photoId);
        });
        
        connect(thumbnail, &QLabel::DoubleClick, this, [this, photoId]() {
            onPhotoDoubleClicked(photoId);
        });
        
        m_gridLayout->addWidget(thumbnail, row, col);
        
        col++;
        if (col >= m_columnCount) {
            col = 0;
            row++;
        }
    }
}

QString PhotoGrid::getPhotoUrl(const QVariantMap& photo, const QString& type) {
    if (type == "thumbnail") {
        return photo.value("thumbnailUrl").toString();
    } else if (type == "preview") {
        return photo.value("previewUrl").toString();
    } else if (type == "tiny") {
        return photo.value("tinyUrl").toString();
    }
    return photo.value("url").toString();
}

void PhotoGrid::setSelectionMode(bool multiSelect) {
    m_multiSelect = multiSelect;
    if (!multiSelect) {
        m_selectedIds.clear();
    }
}

void PhotoGrid::onPhotoClicked(const QString& photoId) {
    if (m_multiSelect) {
        if (m_selectedIds.contains(photoId)) {
            m_selectedIds.remove(photoId);
        } else {
            m_selectedIds.insert(photoId);
        }
    } else {
        m_selectedIds.clear();
        m_selectedIds.insert(photoId);
    }
    
    QVector<QString> selected;
    for (const QString& id : m_selectedIds) {
        selected.append(id);
    }
    
    emit selectionChanged(selected);
    emit photoClicked(photoId);
}

void PhotoGrid::onPhotoDoubleClicked(const QString& photoId) {
    emit photoDoubleClicked(photoId);
}

} // namespace ClickFlash
