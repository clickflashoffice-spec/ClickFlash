#pragma once

#include <QString>
#include <QVector>
#include <QFileSystemWatcher>

namespace ClickFlash {

class FolderWorker : public QObject {
    Q_OBJECT

public:
    explicit FolderWorker(QObject* parent = nullptr);
    ~FolderWorker();
    
    void watchFolder(const QString& path);
    void stopWatching();
    
    bool isWatching() const { return m_watching; }
    QString watchedFolder() const { return m_watchedFolder; }

signals:
    void newPhotoDetected(const QString& filePath);
    void folderChanged(const QString& path);

private slots:
    void onDirectoryChanged(const QString& path);

private:
    void processNewFiles(const QString& path);
    
    QFileSystemWatcher* m_watcher;
    bool m_watching;
    QString m_watchedFolder;
    QVector<QString> m_knownFiles;
};

} // namespace ClickFlash
