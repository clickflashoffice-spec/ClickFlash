#pragma once

#include <QJsonObject>
#include <QJsonArray>
#include <QString>

namespace ClickFlash {

class SyncService {
public:
    static QJsonObject pushMutation(const QJsonObject& mutationData, const QString& kioskId = "");
    static QJsonObject pullChanges(const QJsonObject& requestData, const QString& kioskId = "");
    static QJsonObject getSyncStatus();
    static bool resolveConflict(const QString& entityType, const QString& entityId, const QJsonObject& resolution);
    static QJsonArray getPendingOperations();
    static bool markSynced(const QString& operationId);

    static qint64 getCurrentSequence(const QString& nodeId);
    static QJsonObject advanceSequence(const QString& nodeId);

private:
    static bool validateHmacSignature(const QString& kioskId, const QString& timestamp, const QString& signature);
    static QJsonObject mergeChanges(const QJsonArray& localChanges, const QJsonArray& remoteChanges);
};

} // namespace ClickFlash
