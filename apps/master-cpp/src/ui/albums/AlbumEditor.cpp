#include "ui/albums/AlbumEditor.h"
#include "database/DatabaseManager.h"
#include "services/PhotoService.h"
#include "core/Logger.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QLabel>
#include <QMessageBox>
#include <QFileDialog>

namespace ClickFlash {

AlbumEditor::AlbumEditor(const QString& albumId, QWidget* parent)
    : QWidget(parent)
    , m_albumId(albumId)
{
    setWindowTitle("Album Editor");
    resize(1200, 800);
    
    QHBoxLayout* mainLayout = new QHBoxLayout(this);
    
    // Left panel - Album details
    QWidget* leftPanel = new QWidget(this);
    QVBoxLayout* leftLayout = new QVBoxLayout(leftPanel);
    
    QGroupBox* detailsGroup = new QGroupBox("Album Details", this);
    QFormLayout* form = new QFormLayout();
    
    m_name = new QLineEdit(this);
    m_description = new QLineEdit(this);
    m_photographer = new QComboBox(this);
    m_status = new QComboBox(this);
    
    m_status->addItems({"draft", "in_progress", "ready", "published"});
    
    form->addRow("Name:", m_name);
    form->addRow("Description:", m_description);
    form->addRow("Photographer:", m_photographer);
    form->addRow("Status:", m_status);
    
    detailsGroup->setLayout(form);
    leftLayout->addWidget(detailsGroup);
    
    // Cover preview
    QGroupBox* coverGroup = new QGroupBox("Cover Photo", this);
    QVBoxLayout* coverLayout = new QVBoxLayout();
    
    m_coverPreview = new QLabel(this);
    m_coverPreview->setMinimumSize(200, 150);
    m_coverPreview->setStyleSheet("border: 1px solid #ccc; background: #f0f0f0;");
    m_coverPreview->setAlignment(Qt::AlignCenter);
    m_coverPreview->setText("No cover selected");
    
    QPushButton* updateCoverBtn = new QPushButton("Set Cover", this);
    connect(updateCoverBtn, &QPushButton::clicked, this, &AlbumEditor::updateCover);
    
    coverLayout->addWidget(m_coverPreview);
    coverLayout->addWidget(updateCoverBtn);
    coverGroup->setLayout(coverLayout);
    leftLayout->addWidget(coverGroup);
    
    leftLayout->addStretch();
    
    // Action buttons
    m_saveBtn = new QPushButton("Save Album", this);
    m_publishBtn = new QPushButton("Publish", this);
    
    connect(m_saveBtn, &QPushButton::clicked, this, &AlbumEditor::saveAlbum);
    connect(m_publishBtn, &QPushButton::clicked, this, &AlbumEditor::publishAlbum);
    
    QHBoxLayout* btnLayout = new QHBoxLayout();
    btnLayout->addWidget(m_saveBtn);
    btnLayout->addWidget(m_publishBtn);
    leftLayout->addLayout(btnLayout);
    
    mainLayout->addWidget(leftPanel, 1);
    
    // Right panel - Photo grid
    QWidget* rightPanel = new QWidget(this);
    QVBoxLayout* rightLayout = new QVBoxLayout(rightPanel);
    
    QLabel* photosLabel = new QLabel("Photos", this);
    rightLayout->addWidget(photosLabel);
    
    m_photosTable = new QTableWidget(this);
    m_photosTable->setColumnCount(4);
    m_photosTable->setHorizontalHeaderLabels({"ID", "Thumbnail", "Status", "Actions"});
    m_photosTable->horizontalHeader()->setStretchLastSection(true);
    rightLayout->addWidget(m_photosTable);
    
    QHBoxLayout* photoBtnLayout = new QHBoxLayout();
    QPushButton* addPhotosBtn = new QPushButton("Add Photos", this);
    QPushButton* removePhotoBtn = new QPushButton("Remove", this);
    
    connect(addPhotosBtn, &QPushButton::clicked, this, &AlbumEditor::addPhotos);
    connect(removePhotoBtn, &QPushButton::clicked, this, &AlbumEditor::removePhoto);
    
    photoBtnLayout->addWidget(addPhotosBtn);
    photoBtnLayout->addWidget(removePhotoBtn);
    photoBtnLayout->addStretch();
    rightLayout->addLayout(photoBtnLayout);
    
    mainLayout->addWidget(rightPanel, 2);
    
    // Load album data
    loadAlbum();
}

AlbumEditor::~AlbumEditor() {
}

void AlbumEditor::loadAlbum() {
    if (m_albumId.isEmpty()) return;
    
    auto album = DatabaseManager::instance().executeQuery(
        "SELECT * FROM albums WHERE id = :id",
        {{"id", m_albumId}}
    );
    
    if (!album.isEmpty()) {
        m_name->setText(album.value("name").toString());
        m_description->setText(album.value("description").toString());
        m_status->setCurrentText(album.value("status").toString());
        
        // Load photographers
        auto photographers = DatabaseManager::instance().executeQueryMultiple(
            "SELECT id, name FROM users WHERE role = 'Photographer'"
        );
        
        for (const auto& p : photographers) {
            m_photographer->addItem(p.value("name").toString(), p.value("id").toString());
        }
        
        // Load photos
        auto photos = PhotoService::instance().getPhotos(m_albumId);
        
        for (const auto& photo : photos) {
            int row = m_photosTable->rowCount();
            m_photosTable->insertRow(row);
            
            m_photosTable->setItem(row, 0, new QTableWidgetItem(photo.value("id").toString()));
            m_photosTable->setItem(row, 2, new QTableWidgetItem(photo.value("culling_status").toString()));
        }
    }
}

void AlbumEditor::saveAlbum() {
    if (m_albumId.isEmpty()) return;
    
    bool success = DatabaseManager::instance().execute(
        R"(
            UPDATE albums 
            SET name = :name, description = :description, photographer_id = :photographer_id, status = :status, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        )",
        {
            {"id", m_albumId},
            {"name", m_name->text()},
            {"description", m_description->text()},
            {"photographer_id", m_photographer->currentData()},
            {"status", m_status->currentText()}
        }
    );
    
    if (success) {
        CF_INFO("Album saved: {}", m_albumId.toStdString());
        QMessageBox::information(this, "Saved", "Album saved successfully.");
    } else {
        QMessageBox::critical(this, "Error", "Failed to save album.");
    }
}

void AlbumEditor::addPhotos() {
    QStringList files = QFileDialog::getOpenFileNames(this, "Select Photos",
        QString(), "Images (*.png *.jpg *.jpeg *.RAW *.CR2 *.NEF)");
    
    if (files.isEmpty()) return;
    
    // Add photos to album
    for (const QString& file : files) {
        QVariantMap photoData;
        photoData["album_id"] = m_albumId;
        photoData["url"] = "local://" + file;
        photoData["storage_path"] = file;
        
        PhotoService::instance().createPhoto(photoData);
    }
    
    CF_INFO("Added {} photos to album {}", files.size(), m_albumId.toStdString());
    loadAlbum();
}

void AlbumEditor::removePhoto() {
    int row = m_photosTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Select a photo to remove.");
        return;
    }
    
    QString photoId = m_photosTable->item(row, 0)->text();
    
    int ret = QMessageBox::question(this, "Confirm Remove",
        "Remove this photo from the album?", QMessageBox::Yes | QMessageBox::No);
    
    if (ret == QMessageBox::Yes) {
        PhotoService::instance().deletePhoto(photoId);
        loadAlbum();
    }
}

void AlbumEditor::updateCover() {
    int row = m_photosTable->currentRow();
    if (row < 0) {
        QMessageBox::warning(this, "No Selection", "Select a photo as cover.");
        return;
    }
    
    QString photoId = m_photosTable->item(row, 0)->text();
    
    DatabaseManager::instance().execute(
        "UPDATE albums SET cover_photo_id = :cover_id WHERE id = :album_id",
        {{"cover_id", photoId}, {"album_id", m_albumId}}
    );
    
    m_coverPreview->setText("Cover: " + photoId.left(8) + "...");
}

void AlbumEditor::publishAlbum() {
    if (m_status->currentText() != "ready") {
        QMessageBox::warning(this, "Not Ready", "Set album status to 'ready' before publishing.");
        return;
    }
    
    saveAlbum();
    
    QMessageBox::information(this, "Published", "Album published successfully!");
}

} // namespace ClickFlash