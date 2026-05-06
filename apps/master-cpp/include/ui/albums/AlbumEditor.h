#pragma once

#include "ui/View.h"
#include <QWidget>
#include <QTableWidget>
#include <QPushButton>
#include <QLineEdit>
#include <QComboBox>

namespace ClickFlash {

class AlbumEditor : public QWidget {
    Q_OBJECT

public:
    explicit AlbumEditor(const QString& albumId, QWidget* parent = nullptr);
    ~AlbumEditor();

private slots:
    void saveAlbum();
    void addPhotos();
    void removePhoto();
    void updateCover();
    void publishAlbum();

private:
    void loadAlbum();
    
    QString m_albumId;
    QLineEdit* m_name;
    QLineEdit* m_description;
    QComboBox* m_photographer;
    QComboBox* m_status;
    QTableWidget* m_photosTable;
    QLabel* m_coverPreview;
    QPushButton* m_saveBtn;
    QPushButton* m_publishBtn;
};

} // namespace ClickFlash