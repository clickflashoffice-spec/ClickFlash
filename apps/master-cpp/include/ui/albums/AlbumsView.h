#pragma once

#include "ui/View.h"
#include <QVector>
#include <QString>

namespace ClickFlash {

class AlbumsView : public View {
    Q_OBJECT

public:
    explicit AlbumsView(QWidget* parent = nullptr);
    ~AlbumsView();

    void refresh() override;

private slots:
    void loadAlbums();
    void onAlbumClicked(const QString& albumId);
    void onCreateAlbum();

private:
    void setupAlbumGrid();

    QWidget* m_albumGrid;
    QVector<QString> m_albumIds;
};

} // namespace ClickFlash
