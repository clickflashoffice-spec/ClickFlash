#pragma once

#include <QThread>
#include <QMutex>
#include <QWaitCondition>
#include <QQueue>
#include <QVariantMap>

namespace ClickFlash {

struct WorkerJob {
    QString id;
    QString type;
    QString data;
    int priority;
    int attempts;
    QString error;
};

class WorkerPool : public QObject {
    Q_OBJECT

public:
    static WorkerPool& instance() {
        static WorkerPool instance;
        return instance;
    }
    
    void initialize(int workerCount = 4);
    void shutdown();
    
    void enqueue(const QString& type, const QString& data, int priority = 0);
    
signals:
    void jobStarted(const QString& jobId);
    void jobCompleted(const QString& jobId);
    void jobFailed(const QString& jobId, const QString& error);

private slots:
    void processNextJob();

private:
    explicit WorkerPool(QObject* parent = nullptr);
    ~WorkerPool();
    
    void createWorker(int id);
    
    QVector<QThread*> m_workers;
    QQueue<WorkerJob> m_jobQueue;
    QMutex m_queueMutex;
    QWaitCondition m_queueCondition;
    bool m_shutdown;
    int m_activeWorkers;
};

} // namespace ClickFlash
