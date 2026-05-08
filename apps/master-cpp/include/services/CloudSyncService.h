#pragma once

#include <QObject>
#include <QString>
#include <QQueue>
#include <QTimer>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QVariantMap>

namespace ClickFlash {

class CloudSyncService : public QObject {
    Q_OBJECT

public:
    static CloudSyncService& instance() {
        static CloudSyncService instance;
        return instance;
    }

    void initialize(const QString& endpoint, const QString& apiKey);
    void shutdown();
    
    // Sync operations
    void syncNow();
    void queueUpload(const QString& entityType, const QString& entityId, const QVariantMap& data);
    void queueDownload(const QString& entityType, const QString& entityId);
    
    // Status
    bool isSyncing() const { return m_syncing; }
    QString lastSyncTime() const { return m_lastSyncTime; }
    int pendingUploads() const { return m_uploadQueue.size(); }
    int pendingDownloads() const { return m_downloadQueue.size(); }
    
    // Configuration
    void setAutoSync(bool enabled);
    void setSyncInterval(int minutes);
    void setCompressionEnabled(bool enabled);

signals:
    void syncStarted();
    void syncProgress(int percent, const QString& message);
    void syncCompleted();
    void syncError(const QString& error);
    void uploadQueued(const QString& entityType, const QString& entityId);
    void downloadQueued(const QString& entityType, const QString& entityId);

private slots:
    void processSync();
    void processUpload();
    void processDownload();
    void handleNetworkReply();

private:
    bool m_initialized;
    bool m_syncing;
    bool m_autoSync;
    bool m_compressionEnabled;
    
    QString m_endpoint;
    QString m_apiKey;
    QString m_lastSyncTime;
    int m_syncInterval;
    
    QNetworkAccessManager* m_networkManager;
    QTimer* m_syncTimer;
    QTimer* m_processTimer;
    
    struct SyncItem {
        QString id;
        QString entityType;
        QString entityId;
        QVariantMap data;
        int attempts;
        QString error;
    };
    
    QQueue<SyncItem> m_uploadQueue;
    QQueue<SyncItem> m_downloadQueue;
    
    void performSync();
    bool uploadItem(const SyncItem& item);
    bool downloadItem(const SyncItem& item);
    QString getAuthHeader() const;
};

} // namespace ClickFlash