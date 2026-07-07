#include "services/FulfillmentService.h"
#include "services/OrderService.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include "core/Config.h"
#include <QUuid>
#include <QDateTime>
#include <QDir>
#include <QProcess>

namespace ClickFlash {

FulfillmentService::FulfillmentService(QObject* parent)
    : QObject(parent)
{
}

QJsonObject FulfillmentService::createFulfillmentJob(const QString& orderId) {
    QJsonObject job;

    QString jobId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString now = QDateTime::currentDateTime().toString(Qt::ISODate);

    DatabaseManager& db = DatabaseManager::instance();

    db.execute(
        "INSERT INTO fulfillment_queue (uuid, order_id, job_type, status, created_at, updated_at) VALUES (:uuid, :orderId, 'bundle', 'pending', :now, :now)",
        {{"uuid", jobId}, {"orderId", orderId}, {"now", now}}
    );

    job["jobId"] = jobId;
    job["orderId"] = orderId;
    job["status"] = "pending";
    job["createdAt"] = now;

    CF_INFO("Fulfillment job created: {} for order {}", jobId.toStdString(), orderId.toStdString());

    return job;
}

QJsonObject FulfillmentService::getFulfillmentStatus(const QString& jobId) {
    DatabaseManager& db = DatabaseManager::instance();

    auto result = db.executeQuery(
        "SELECT * FROM fulfillment_queue WHERE uuid = :uuid",
        {{"uuid", jobId}}
    );

    if (result.isEmpty()) {
        return QJsonObject();
    }

    return QJsonObject{
        {"jobId", result.value("uuid")},
        {"orderId", result.value("order_id")},
        {"jobType", result.value("job_type")},
        {"status", result.value("status")},
        {"attempts", result.value("attempts")},
        {"error", result.value("error_message")},
        {"processedAt", result.value("processed_at")},
        {"createdAt", result.value("created_at")}
    };
}

QJsonArray FulfillmentService::getPendingJobs() {
    DatabaseManager& db = DatabaseManager::instance();

    auto results = db.executeQueryMultiple(
        "SELECT * FROM fulfillment_queue WHERE status = 'pending' ORDER BY created_at ASC"
    );

    QJsonArray jobs;
    for (const auto& row : results) {
        jobs.append(QJsonObject{
            {"jobId", row.value("uuid")},
            {"orderId", row.value("order_id")},
            {"jobType", row.value("job_type")},
            {"status", row.value("status")}
        });
    }

    return jobs;
}

bool FulfillmentService::processJob(const QString& jobId) {
    DatabaseManager& db = DatabaseManager::instance();

    db.execute(
        "UPDATE fulfillment_queue SET status = 'processing', attempts = attempts + 1, updated_at = :now WHERE uuid = :uuid",
        {{"uuid", jobId}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    emit jobStarted(jobId);

    CF_DEBUG("Processing fulfillment job: {}", jobId.toStdString());

    auto status = getFulfillmentStatus(jobId);
    QString orderId = status.value("orderId").toString();

    QString bundlePath = createZipBundle(orderId);

    if (bundlePath.isEmpty()) {
        markJobFailed(jobId, "Failed to create bundle");
        return false;
    }

    return markJobComplete(jobId, bundlePath);
}

bool FulfillmentService::markJobComplete(const QString& jobId, const QString& outputPath) {
    DatabaseManager& db = DatabaseManager::instance();

    bool success = db.execute(
        "UPDATE fulfillment_queue SET status = 'completed', updated_at = :now, processed_at = :now WHERE uuid = :uuid",
        {{"uuid", jobId}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    if (success) {
        CF_INFO("Fulfillment job completed: {}", jobId.toStdString());
        emit jobCompleted(jobId);
    }

    return success;
}

bool FulfillmentService::markJobFailed(const QString& jobId, const QString& error) {
    DatabaseManager& db = DatabaseManager::instance();

    bool success = db.execute(
        "UPDATE fulfillment_queue SET status = 'failed', error_message = :error, updated_at = :now WHERE uuid = :uuid",
        {{"uuid", jobId}, {"error", error}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    if (success) {
        CF_WARN("Fulfillment job failed: {} - {}", jobId.toStdString(), error.toStdString());
        emit jobFailed(jobId, error);
    }

    return success;
}

QString FulfillmentService::createZipBundle(const QString& orderId) {
    QString outputDir = getOutputDirectory();
    QString zipPath = QString("%1/order_%2.zip").arg(outputDir, orderId);

    QDir().mkpath(outputDir);

    CF_DEBUG("Creating ZIP bundle: {}", zipPath.toStdString());

    return zipPath;
}

QString FulfillmentService::pushToKiosk(const QString& orderId, const QString& kioskId) {
    QString bundlePath = createZipBundle(orderId);

    if (bundlePath.isEmpty()) {
        return QString();
    }

    CF_INFO("Pushing order {} to kiosk {}", orderId.toStdString(), kioskId.toStdString());

    return bundlePath;
}

QString FulfillmentService::getOutputDirectory() {
    QString outputDir = Config::instance().getDatabasePath();
    QFileInfo fileInfo(outputDir);
    return fileInfo.absolutePath() + "/fulfillment";
}

} // namespace ClickFlash
