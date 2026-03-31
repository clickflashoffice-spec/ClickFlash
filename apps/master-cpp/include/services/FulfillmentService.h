#pragma once

#include <QObject>
#include <QString>
#include <QJsonObject>
#include <QJsonArray>

namespace ClickFlash {

class FulfillmentService : public QObject {
    Q_OBJECT

public:
    explicit FulfillmentService(QObject* parent = nullptr);

    QJsonObject createFulfillmentJob(const QString& orderId);
    QJsonObject getFulfillmentStatus(const QString& jobId);
    QJsonArray getPendingJobs();
    bool processJob(const QString& jobId);
    bool markJobComplete(const QString& jobId, const QString& outputPath);
    bool markJobFailed(const QString& jobId, const QString& error);

    QString createZipBundle(const QString& orderId);
    QString pushToKiosk(const QString& orderId, const QString& kioskId);

signals:
    void jobStarted(const QString& jobId);
    void jobCompleted(const QString& jobId);
    void jobFailed(const QString& jobId, const QString& error);
    void progressUpdated(const QString& jobId, int percent);

private:
    QString getOutputDirectory();
};

} // namespace ClickFlash
