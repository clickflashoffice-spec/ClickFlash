#include "services/QueueProcessor.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"
#include <QUuid>
#include <QDateTime>
#include <QTimer>

namespace ClickFlash {

QueueProcessor::QueueProcessor(QObject* parent)
    : QObject(parent)
    , m_maxConcurrent(4)
    , m_currentProcessing(0)
    , m_running(false)
    , m_paused(false)
{
}

QueueProcessor::~QueueProcessor() {
    stop();
}

void QueueProcessor::start() {
    if (m_running) return;

    m_running = true;
    CF_INFO("Queue processor started");

    QTimer::singleShot(100, this, &QueueProcessor::processNextJob);
}

void QueueProcessor::stop() {
    m_running = false;
    CF_INFO("Queue processor stopped");
}

void QueueProcessor::pause() {
    m_paused = true;
    CF_INFO("Queue processor paused");
}

void QueueProcessor::resume() {
    m_paused = false;
    CF_INFO("Queue processor resumed");
    processNextJob();
}

QString QueueProcessor::enqueue(const QString& jobType, const QJsonObject& data, int priority) {
    QueueJob job;
    job.id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    job.type = jobType;
    job.data = QString(QJsonDocument(data).toJson(QJsonDocument::Compact));
    job.priority = priority;
    job.attempts = 0;
    job.maxAttempts = 3;
    job.status = "pending";

    DatabaseManager& db = DatabaseManager::instance();

    db.execute(
        "INSERT INTO processing_queue (uuid, job_type, priority, data_json, status, attempts, max_attempts, created_at, updated_at) VALUES (:uuid, :type, :priority, :data, :status, :attempts, :maxAttempts, :now, :now)",
        {
            {"uuid", job.id},
            {"type", job.type},
            {"priority", job.priority},
            {"data", job.data},
            {"status", job.status},
            {"attempts", job.attempts},
            {"maxAttempts", job.maxAttempts},
            {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}
        }
    );

    m_jobQueue.enqueue(job);

    CF_DEBUG("Job enqueued: {} (type: {})", job.id.toStdString(), job.type.toStdString());

    emit queueChanged();

    if (m_running && !m_paused) {
        QTimer::singleShot(0, this, &QueueProcessor::processNextJob);
    }

    return job.id;
}

bool QueueProcessor::dequeue(const QString& jobId) {
    for (int i = 0; i < m_jobQueue.size(); ++i) {
        if (m_jobQueue[i].id == jobId) {
            m_jobQueue.removeAt(i);
            
            DatabaseManager& db = DatabaseManager::instance();
            db.execute(
                "UPDATE processing_queue SET status = 'cancelled', updated_at = :now WHERE uuid = :uuid",
                {{"uuid", jobId}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
            );

            emit queueChanged();
            return true;
        }
    }
    return false;
}

QJsonObject QueueProcessor::getJobStatus(const QString& jobId) {
    DatabaseManager& db = DatabaseManager::instance();

    auto result = db.executeQuery(
        "SELECT * FROM processing_queue WHERE uuid = :uuid",
        {{"uuid", jobId}}
    );

    if (result.isEmpty()) {
        return QJsonObject();
    }

    return QJsonObject{
        {"id", result.value("uuid")},
        {"type", result.value("job_type")},
        {"priority", result.value("priority")},
        {"status", result.value("status")},
        {"attempts", result.value("attempts")},
        {"error", result.value("error_message")},
        {"createdAt", result.value("created_at")}
    };
}

QJsonArray QueueProcessor::getPendingJobs() {
    DatabaseManager& db = DatabaseManager::instance();

    auto results = db.executeQueryMultiple(
        "SELECT * FROM processing_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC"
    );

    QJsonArray jobs;
    for (const auto& row : results) {
        jobs.append(QJsonObject{
            {"id", row.value("uuid")},
            {"type", row.value("job_type")},
            {"priority", row.value("priority")}
        });
    }

    return jobs;
}

QJsonArray QueueProcessor::getProcessingJobs() {
    DatabaseManager& db = DatabaseManager::instance();

    auto results = db.executeQueryMultiple(
        "SELECT * FROM processing_queue WHERE status = 'processing' ORDER BY started_at ASC"
    );

    QJsonArray jobs;
    for (const auto& row : results) {
        jobs.append(QJsonObject{
            {"id", row.value("uuid")},
            {"type", row.value("job_type")},
            {"attempts", row.value("attempts")}
        });
    }

    return jobs;
}

int QueueProcessor::getQueueSize() const {
    return m_jobQueue.size();
}

void QueueProcessor::processNextJob() {
    if (!m_running || m_paused) return;
    if (m_currentProcessing >= m_maxConcurrent) return;
    if (m_jobQueue.isEmpty()) {
        emit queueEmpty();
        return;
    }

    QueueJob job = m_jobQueue.dequeue();
    job.status = "processing";

    DatabaseManager& db = DatabaseManager::instance();

    db.execute(
        "UPDATE processing_queue SET status = 'processing', started_at = :now, updated_at = :now WHERE uuid = :uuid",
        {{"uuid", job.id}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    m_processingJobs[job.id] = job;
    m_currentProcessing++;

    emit jobStarted(job.id);
    CF_DEBUG("Processing job: {} ({})", job.id.toStdString(), job.type.toStdString());

    QTimer::singleShot(100, this, [this, job]() {
        executeJob(job);
    });
}

void QueueProcessor::executeJob(const QueueJob& job) {
    QString handler = getJobTypeHandler(job.type);

    CF_DEBUG("Executing job handler: {} for job {}", handler.toStdString(), job.id.toStdString());

    QJsonObject result;
    result["success"] = true;
    result["output"] = "";

    onJobCompleted(job.id);
}

void QueueProcessor::onJobCompleted(const QString& jobId) {
    if (!m_processingJobs.contains(jobId)) return;

    QueueJob job = m_processingJobs.take(jobId);
    job.status = "completed";
    job.attempts++;

    DatabaseManager& db = DatabaseManager::instance();

    db.execute(
        "UPDATE processing_queue SET status = 'completed', completed_at = :now, updated_at = :now WHERE uuid = :uuid",
        {{"uuid", jobId}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    m_completedJobs[jobId] = job;
    m_currentProcessing--;

    emit jobCompleted(jobId, QJsonObject{{"success", true}});
    emit queueChanged();

    CF_DEBUG("Job completed: {}", jobId.toStdString());

    processNextJob();
}

void QueueProcessor::onJobFailed(const QString& jobId, const QString& error) {
    if (!m_processingJobs.contains(jobId)) return;

    QueueJob job = m_processingJobs[jobId];
    job.attempts++;
    job.error = error;

    DatabaseManager& db = DatabaseManager::instance();

    if (job.attempts >= job.maxAttempts) {
        job.status = "failed";

        db.execute(
            "UPDATE processing_queue SET status = 'failed', error_message = :error, attempts = :attempts, updated_at = :now WHERE uuid = :uuid",
            {{"uuid", jobId}, {"error", error}, {"attempts", job.attempts}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
        );

        m_processingJobs.remove(jobId);
        m_currentProcessing--;

        emit jobFailed(jobId, error);
        CF_WARN("Job failed after {} attempts: {}", job.attempts, jobId.toStdString());
    } else {
        db.execute(
            "UPDATE processing_queue SET attempts = :attempts, error_message = :error, status = 'pending', updated_at = :now WHERE uuid = :uuid",
            {{"uuid", jobId}, {"attempts", job.attempts}, {"error", error}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
        );

        m_jobQueue.enqueue(job);
        m_processingJobs.remove(jobId);
        m_currentProcessing--;

        CF_DEBUG("Job re-queued after attempt {}: {}", job.attempts, jobId.toStdString());
    }

    emit queueChanged();
    processNextJob();
}

void QueueProcessor::updateJobStatus(const QString& jobId, const QString& status) {
    DatabaseManager& db = DatabaseManager::instance();

    db.execute(
        "UPDATE processing_queue SET status = :status, updated_at = :now WHERE uuid = :uuid",
        {{"uuid", jobId}, {"status", status}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );
}

QString QueueProcessor::getJobTypeHandler(const QString& jobType) {
    static QMap<QString, QString> handlers = {
        {"thumbnail", "ThumbnailWorker"},
        {"watermark", "WatermarkWorker"},
        {"face_detect", "FaceWorker"},
        {"ai_score", "MLWorker"},
        {"folder_scan", "FolderWorker"}
    };

    return handlers.value(jobType, "UnknownWorker");
}

} // namespace ClickFlash
