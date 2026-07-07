#pragma once

#include <QJsonObject>
#include <QJsonArray>
#include <QString>

namespace ClickFlash {

class CollectionService {
public:
    static QJsonArray list(const QString& collection, const QJsonObject& filters = QJsonObject());
    static QJsonObject get(const QString& collection, const QString& id);
    static QJsonObject create(const QString& collection, const QJsonObject& data);
    static QJsonObject update(const QString& collection, const QString& id, const QJsonObject& data);
    static bool remove(const QString& collection, const QString& id);
    static QJsonArray query(const QString& collection, const QString& sql, const QJsonObject& params = QJsonObject());

    static QJsonArray getAlbums(const QJsonObject& filters = QJsonObject());
    static QJsonArray getPhotos(const QString& albumId, const QJsonObject& filters = QJsonObject());
    static QJsonArray getOrders(const QJsonObject& filters = QJsonObject());
    static QJsonArray getBookings(const QJsonObject& filters = QJsonObject());
    static QJsonArray getUsers(const QJsonObject& filters = QJsonObject());
    static QJsonArray getProducts(const QJsonObject& filters = QJsonObject());
    static QJsonArray getKiosks(const QJsonObject& filters = QJsonObject());

private:
    static QString mapCollectionToTable(const QString& collection);
    static QJsonObject mapRowToObject(const QVariantMap& row);
};

} // namespace ClickFlash
