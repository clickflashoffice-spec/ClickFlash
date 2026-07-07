#include "services/CloudSyncService.h"
#include "core/Logger.h"
#include "core/Config.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonValue>
#include <QTimer>
#include <QUuid>
#include <QDateTime>
#include <QNetworkRequest>

namespace ClickFlash {

void CloudSyncService::initialize(const QString& endpoint, const QString& apiKey) {
    m_endpoint = endpoint;
    m_apiKey = apiKey;
    m_initialized = true;
    m_syncing = false;
    m_autoSync = true;
    m_compressionEnabled = true;
    m_syncInterval = 15;
    
    m_networkManager = new QNetworkAccessManager(this);
    
    m_syncTimer = new QTimer(this);
    m_processTimer = new QTimer(this);
    
    connect(m_syncTimer, &QTimer::timeout, this, &CloudSyncService::processSync);
    connect(m_processTimer, &QTimer::timeout, this, [this]() {
        if (!m_uploadQueue.isEmpty()) processUpload();
        if (!m_downloadQueue.isEmpty()) processDownload();
    });
    
    // Start auto-sync
    m_syncTimer->start(m_syncInterval * 60 * 1000);
    m_processTimer->start(5000);
    
    CF_INFO("CloudSyncService initialized with endpoint: {}", m_endpoint.toStdString());
}

void CloudSyncService::shutdown() {
    m_syncTimer->stop();
    m_processTimer->stop();
    m_initialized = false;
    CF_INFO("CloudSyncService shutdown");
}

void CloudSyncService::syncNow() {
    if (m_syncing || !m_initialized) return;
    
    CF_INFO("Starting manual sync");
    performSync();
}

void CloudSyncService::queueUpload(const QString& entityType, const QString& entityId, const QVariantMap& data) {
    SyncItem item;
    item.id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    item.entityType = entityType;
    item.entityId = entityId;
    item.data = data;
    item.attempts = 0;
    
    m_uploadQueue.enqueue(item);
    CF_DEBUG("Upload queued: {} {}", entityType.toStdString(), entityId.toStdString());
    
    emit uploadQueued(entityType, entityId);
}

void CloudSyncService::queueDownload(const QString& entityType, const QString& entityId) {
    SyncItem item;
    item.id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    item.entityType = entityType;
    item.entityId = entityId;
    item.attempts = 0;
    
    m_downloadQueue.enqueue(item);
    CF_DEBUG("Download queued: {} {}", entityType.toStdString(), entityId.toStdString());
    
    emit downloadQueued(entityType, entityId);
}

void CloudSyncService::setAutoSync(bool enabled) {
    m_autoSync = enabled;
    if (enabled) {
        m_syncTimer->start();
    } else {
        m_syncTimer->stop();
    }
}

void CloudSyncService::setSyncInterval(int minutes) {
    m_syncInterval = minutes;
    m_syncTimer->setInterval(minutes * 60 * 1000);
}

void CloudSyncService::setCompressionEnabled(bool enabled) {
    m_compressionEnabled = enabled;
}

void CloudSyncService::processSync() {
    if (!m_autoSync) return;
    performSync();
}

void CloudSyncService::processUpload() {
    if (m_uploadQueue.isEmpty()) return;
    
    SyncItem item = m_uploadQueue.head();
    if (uploadItem(item)) {
        m_uploadQueue.dequeue();
    } else {
        item.attempts++;
        if (item.attempts >= 3) {
            CF_ERROR("Upload failed after 3 attempts: {}", item.entityId.toStdString());
            m_uploadQueue.dequeue();
        }
    }
}

void CloudSyncService::processDownload() {
    if (m_downloadQueue.isEmpty()) return;
    
    SyncItem item = m_downloadQueue.head();
    if (downloadItem(item)) {
        m_downloadQueue.dequeue();
    } else {
        item.attempts++;
        if (item.attempts >= 3) {
            CF_ERROR("Download failed after 3 attempts: {}", item.entityId.toStdString());
            m_downloadQueue.dequeue();
        }
    }
}

void CloudSyncService::performSync() {
    if (m_syncing) return;
    
    m_syncing = true;
    emit syncStarted();
    
    // Process upload queue first
    int totalItems = m_uploadQueue.size() + m_downloadQueue.size();
    int processed = 0;
    
    while (!m_uploadQueue.isEmpty()) {
        SyncItem item = m_uploadQueue.dequeue();
        if (uploadItem(item)) {
            processed++;
            emit syncProgress((processed * 100) / totalItems, "Uploading " + item.entityType);
        }
    }
    
    // Then process download queue
    while (!m_downloadQueue.isEmpty()) {
        SyncItem item = m_downloadQueue.dequeue();
        if (downloadItem(item)) {
            processed++;
            emit syncProgress((processed * 100) / totalItems, "Downloading " + item.entityType);
        }
    }
    
    m_lastSyncTime = QDateTime::currentDateTime().toString(Qt::ISODate);
    m_syncing = false;
    emit syncCompleted();
    
    CF_INFO("Sync completed at {}", m_lastSyncTime.toStdString());
}

bool CloudSyncService::uploadItem(const SyncItem& item) {
    if (m_endpoint.isEmpty()) return false;
    
    QUrl url(m_endpoint + "/api/sync/" + item.entityType);
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    request.setRawHeader("Authorization", getAuthHeader().toUtf8());
    
    QJsonObject body;
    body["id"] = item.entityId;
    for (auto it = item.data.constBegin(); it != item.data.constEnd(); ++it) {
        body[it.key()] = QJsonValue::fromVariant(it.value());
    }
    
    QByteArray data = QJsonDocument(body).toJson();
    
    QNetworkReply* reply = m_networkManager->post(request, data);
    
    // Simplified - in production would use signals/slots properly
    bool success = reply->error() == QNetworkReply::NoError;
    
    if (!success) {
        CF_ERROR("Upload failed: {}", reply->errorString().toStdString());
    }
    
    return success;
}

bool CloudSyncService::downloadItem(const SyncItem& item) {
    if (m_endpoint.isEmpty()) return false;
    
    QUrl url(m_endpoint + "/api/sync/" + item.entityType + "/" + item.entityId);
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    request.setRawHeader("Authorization", getAuthHeader().toUtf8());
    
    QNetworkReply* reply = m_networkManager->get(request);
    
    bool success = reply->error() == QNetworkReply::NoError;
    
    if (success) {
        QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
        // Process downloaded data...
    } else {
        CF_ERROR("Download failed: {}", reply->errorString().toStdString());
    }
    
    return success;
}

QString CloudSyncService::getAuthHeader() const {
    return QString("Bearer %1").arg(m_apiKey);
}

} // namespace ClickFlash