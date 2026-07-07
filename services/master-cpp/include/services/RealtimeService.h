#pragma once

#include "http/HttpServer.h"
#include "database/DatabaseManager.h"
#include <QObject>
#include <QMap>

namespace ClickFlash {

class RealtimeService : public QObject {
    Q_OBJECT

public:
    static RealtimeService& instance() {
        static RealtimeService instance;
        return instance;
    }
    
    using EventCallback = std::function<void(const QString& event, const QVariantMap& data)>;
    
    void subscribe(const QString& clientId, EventCallback callback) {
        QMutexLocker locker(&m_mutex);
        m_subscribers[clientId] = callback;
    }
    
    void unsubscribe(const QString& clientId) {
        QMutexLocker locker(&m_mutex);
        m_subscribers.remove(clientId);
    }
    
    void broadcast(const QString& event, const QVariantMap& data) {
        QMutexLocker locker(&m_mutex);
        
        for (auto it = m_subscribers.begin(); it != m_subscribers.end(); ++it) {
            it.value()(event, data);
        }
    }
    
    void emitOrderUpdated(const QString& orderId, const QString& status) {
        broadcast("order:updated", QVariantMap({
            {"orderId", orderId},
            {"status", status}
        }));
    }
    
    void emitPhotoUploaded(const QString& albumId, const QString& photoId) {
        broadcast("photo:uploaded", QVariantMap({
            {"albumId", albumId},
            {"photoId", photoId}
        }));
    }
    
    void emitKioskConnected(const QString& kioskId) {
        broadcast("kiosk:connected", QVariantMap({
            {"kioskId", kioskId}
        }));
    }
    
    void emitSyncCompleted(int recordsSynced) {
        broadcast("sync:completed", QVariantMap({
            {"recordsSynced", recordsSynced}
        }));
    }
    
    int subscriberCount() const {
        return m_subscribers.size();
    }

signals:
    void eventBroadcast(const QString& event, const QVariantMap& data);

private:
    RealtimeService(QObject* parent = nullptr) : QObject(parent) {}
    ~RealtimeService() = default;
    
    QMap<QString, EventCallback> m_subscribers;
    mutable QMutex m_mutex;
};

} // namespace ClickFlash
