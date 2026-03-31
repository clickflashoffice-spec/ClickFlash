#include "workers/WorkerPool.h"
#include "core/Logger.h"

namespace ClickFlash {

WorkerPool::WorkerPool(QObject* parent)
    : QObject(parent)
    , m_shutdown(false)
    , m_activeWorkers(0)
{
}

WorkerPool::~WorkerPool() {
    shutdown();
}

void WorkerPool::initialize(int workerCount) {
    CF_INFO("Initializing worker pool with {} workers", workerCount);
    
    for (int i = 0; i < workerCount; ++i) {
        createWorker(i);
    }
}

void WorkerPool::shutdown() {
    m_shutdown = true;
    m_queueCondition.wakeAll();
    
    for (QThread* thread : m_workers) {
        thread->quit();
        thread->wait(5000);
    }
    
    m_workers.clear();
    CF_INFO("Worker pool shutdown complete");
}

void WorkerPool::createWorker(int id) {
    QThread* thread = new QThread();
    m_workers.append(thread);
    thread->start();
}

void WorkerPool::enqueue(const QString& type, const QString& data, int priority) {
    QMutexLocker locker(&m_queueMutex);
    
    WorkerJob job;
    job.id = QString("WORKER-%1-%2").arg(type).arg(QDateTime::currentMSecsSinceEpoch());
    job.type = type;
    job.data = data;
    job.priority = priority;
    job.attempts = 0;
    
    m_jobQueue.enqueue(job);
    m_queueCondition.wakeOne();
}

void WorkerPool::processNextJob() {
    QMutexLocker locker(&m_queueMutex);
    
    if (m_jobQueue.isEmpty()) {
        m_queueCondition.wait(&m_queueMutex, 1000);
        return;
    }
    
    if (m_shutdown) return;
    
    WorkerJob job = m_jobQueue.dequeue();
    
    emit jobStarted(job.id);
    
    locker.unlock();
    
    bool success = false;
    QString error;
    
    try {
        if (job.type == "thumbnail") {
            processThumbnail(job);
            success = true;
        } else if (job.type == "watermark") {
            processWatermark(job);
            success = true;
        } else if (job.type == "face_detection") {
            processFaceDetection(job);
            success = true;
        } else if (job.type == "culling") {
            processCulling(job);
            success = true;
        }
    } catch (const std::exception& e) {
        error = e.what();
    }
    
    if (success) {
        emit jobCompleted(job.id);
    } else {
        emit jobFailed(job.id, error);
    }
}

void WorkerPool::processThumbnail(const WorkerJob& job) {
    QThread::sleep(1);
}

void WorkerPool::processWatermark(const WorkerJob& job) {
    QThread::sleep(1);
}

void WorkerPool::processFaceDetection(const WorkerJob& job) {
    QThread::sleep(2);
}

void WorkerPool::processCulling(const WorkerJob& job) {
    QThread::sleep(3);
}

} // namespace ClickFlash
