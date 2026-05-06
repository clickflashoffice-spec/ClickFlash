#pragma once

#include <QObject>
#include <QString>
#include <QList>
#include <QVariantMap>

namespace ClickFlash {

class PhotoService : public QObject {
    Q_OBJECT

public:
    static PhotoService& instance() {
        static PhotoService instance;
        return instance;
    }

    QVariantMap getPhoto(const QString& id);
    QList<QVariantMap> getPhotos(const QString& albumId, int page = 1, int limit = 50);
    QVariantMap createPhoto(const QVariantMap& data);
    bool updatePhoto(const QString& id, const QVariantMap& data);
    bool deletePhoto(const QString& id);
    
    QList<QVariantMap> getPhotosByStatus(const QString& albumId, const QString& status);
    bool updatePhotoStatus(const QString& id, const QString& status);
    
    QList<QVariantMap> searchPhotos(const QString& query, const QString& albumId = "");

signals:
    void photoCreated(const QString& id);
    void photoUpdated(const QString& id);
    void photoDeleted(const QString& id);
    void photoStatusChanged(const QString& id, const QString& status);

private:
    PhotoService(QObject* parent = nullptr) : QObject(parent) {}
    ~PhotoService() = default;
    
    PhotoService(const PhotoService&) = delete;
    PhotoService& operator=(const PhotoService&) = delete;
};

} // namespace ClickFlash