#include "ui/albums/AlbumsView.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include <QGridLayout>
#include <QLabel>
#include <QPushButton>
#include <QFrame>

namespace ClickFlash {

AlbumsView::AlbumsView(QWidget* parent)
    : View(parent)
{
    setupHeader("Albums", true);
    
    QPushButton* createBtn = addActionButton("+ New Album");
    createBtn->connect(createBtn, &QPushButton::clicked, this, &AlbumsView::onCreateAlbum);
    
    m_albumGrid = new QWidget(this);
    m_albumGrid->setStyleSheet("background-color: transparent;");
    
    QVBoxLayout* gridLayout = new QVBoxLayout(m_albumGrid);
    gridLayout->setContentsMargins(0, 16, 0, 0);
    
    QLabel* placeholder = new QLabel("No albums yet. Create your first album!", m_albumGrid);
    placeholder->setAlignment(Qt::AlignCenter);
    placeholder->setStyleSheet("color: #a0a0a0; font-size: 16px; padding: 60px;");
    gridLayout->addWidget(placeholder);
    
    addSection("", m_albumGrid);
    
    refresh();
}

AlbumsView::~AlbumsView() {}

void AlbumsView::refresh() {
    loadAlbums();
}

void AlbumsView::loadAlbums() {
    try {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto albums = db.executeQueryMultiple(
            "SELECT id, name, photo_count, status, shoot_date FROM albums ORDER BY created_at DESC"
        );
        
        CF_DEBUG("Loaded {} albums", albums.size());
        
    } catch (const std::exception& e) {
        CF_ERROR("Failed to load albums: {}", e.what());
    }
}

void AlbumsView::onAlbumClicked(const QString& albumId) {
    CF_DEBUG("Album clicked: {}", albumId.toStdString());
}

void AlbumsView::onCreateAlbum() {
    CF_DEBUG("Create album clicked");
}

} // namespace ClickFlash
