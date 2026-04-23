#pragma once

#include <QObject>
#include <QThread>
#include <QMutex>
#include <QWaitCondition>
#include <QQueue>
#include <QVariantMap>

namespace ClickFlash {

struct QueueJob {
    QString id;
    QString type;
    QString photoId;
    QVariantMap data;
    int priority;
    int attempts;
    QString error;
};

class QueueProcessor : public QObject {
    Q_OBJECT

public:
    static QueueProcessor& instance() {
        static QueueProcessor instance;
        return instance;
    }
    
    void start(int workerCount = 4) {
        m_running = true;
        
        for (int i = 0; i < workerCount; ++i) {
            QThread* thread = new QThread();
            m_threads.append(thread);
            thread->start();
        }
        
        m_processingThread = QThread::create([this]() {
            processLoop();
        });
        m_processingThread->start();
    }
    
    void stop() {
        m_running = false;
        m_condition.wakeAll();
        
        for (QThread* thread : m_threads) {
            thread->quit();
            thread->wait();
        }
        
        if (m_processingThread) {
            m_processingThread->quit();
            m_processingThread->wait();
        }
    }
    
    void enqueue(const QString& type, const QString& photoId, const QVariantMap& data, int priority = 0) {
        QMutexLocker locker(&m_mutex);
        
        QueueJob job;
        job.id = QString("JOB-%1").arg(QDateTime::currentMSecsSinceEpoch());
        job.type = type;
        job.photoId = photoId;
        job.data = data;
        job.priority = priority;
        job.attempts = 0;
        
        m_queue.enqueue(job);
        
        m_condition.wakeOne();
    }

signals:
    void jobStarted(const QString& jobId);
    void jobCompleted(const QString& jobId);
    void jobFailed(const QString& jobId, const QString& error);
    void progressUpdated(int processed, int total);

private:
    QueueProcessor(QObject* parent = nullptr) 
        : QObject(parent), m_running(false), m_processingThread(nullptr) {}
    
    ~QueueProcessor() {
        stop();
    }
    
    void processLoop() {
        while (m_running) {
            QueueJob job;
            
            {
                QMutexLocker locker(&m_mutex);
                
                if (m_queue.isEmpty()) {
                    m_condition.wait(&m_mutex, 1000);
                    continue;
                }
                
                job = m_queue.dequeue();
            }
            
            emit jobStarted(job.id);
            
            bool success = processJob(job);
            
            if (success) {
                emit jobCompleted(job.id);
            } else {
                emit jobFailed(job.id, job.error);
            }
        }
    }
    
    bool processJob(const QueueJob& job) {
        try {
            if (job.type == "thumbnail") {
                return processThumbnail(job);
            } else if (job.type == "watermark") {
                return processWatermark(job);
            } else if (job.type == "face_detection") {
                return processFaceDetection(job);
            } else if (job.type == "ai_culling") {
                return processAiCulling(job);
            }
            
            return true;
            
        } catch (const std::exception& e) {
            job.error = e.what();
            return false;
        }
    }
    
    bool processThumbnail(const QueueJob& job) {
        QString inputPath = job.data.value("inputPath").toString();
        QString outputPath = job.data.value("outputPath").toString();
        int size = job.data.value("size", 300).toInt();
        
        QThread::sleep(1);
        
        return true;
    }
    
    bool processWatermark(const QueueJob& job) {
        QString inputPath = job.data.value("inputPath").toString();
        QString outputPath = job.data.value("outputPath").toString();
        QString watermarkPath = job.data.value("watermarkPath").toString();
        
        QThread::sleep(1);
        
        return true;
    }
    
    bool processFaceDetection(const QueueJob& job) {
        QString photoPath = job.data.value("photoPath").toString();
        
        QThread::sleep(2);
        
        return true;
    }
    
    bool processAiCulling(const QueueJob& job) {
        QString albumId = job.data.value("albumId").toString();
        
        QThread::sleep(3);
        
        return true;
    }
    
    QQueue<QueueJob> m_queue;
    QMutex m_mutex;
    QWaitCondition m_condition;
    QList<QThread*> m_threads;
    QThread* m_processingThread;
    bool m_running;
};

} // namespace ClickFlash
