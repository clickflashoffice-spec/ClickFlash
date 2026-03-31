#include "workers/FolderWorker.h"
#include "core/Logger.h"

namespace ClickFlash {

FolderWorker::FolderWorker(QObject* parent)
    : QObject(parent)
    , m_watcher(new QFileSystemWatcher(this))
    , m_watching(false)
{
    connect(m_watcher, &QFileSystemWatcher::directoryChanged,
            this, &FolderWorker::onDirectoryChanged);
}

FolderWorker::~FolderWorker() {
    stopWatching();
}

void FolderWorker::watchFolder(const QString& path) {
    if (m_watching) {
        stopWatching();
    }
    
    m_watchedFolder = path;
    m_watcher->addPath(path);
    m_watching = true;
    
    processNewFiles(path);
    
    CF_INFO("Now watching folder: {}", path.toStdString());
}

void FolderWorker::stopWatching() {
    if (m_watching) {
        m_watcher->removePaths(m_watcher->files());
        m_watcher->removePaths(m_watcher->directories());
        m_watching = false;
        m_watchedFolder.clear();
        CF_INFO("Stopped watching folder");
    }
}

void FolderWorker::onDirectoryChanged(const QString& path) {
    processNewFiles(path);
    emit folderChanged(path);
}

void FolderWorker::processNewFiles(const QString& path) {
    QDir dir(path);
    
    if (!dir.exists()) {
        CF_WARN("Directory does not exist: {}", path.toStdString());
        return;
    }
    
    QStringList filters;
    filters << "*.jpg" << "*.jpeg" << "*.png" << "*.raw" << "*.cr2" << "*.nef" << "*.arw";
    
    QFileInfoList files = dir.entryInfoList(filters, QDir::Files);
    
    for (const QFileInfo& file : files) {
        QString filePath = file.absoluteFilePath();
        
        if (!m_knownFiles.contains(filePath)) {
            if (file.created() > QDateTime::currentDateTime().addSecs(-60)) {
                m_knownFiles.append(filePath);
                emit newPhotoDetected(filePath);
                CF_INFO("New photo detected: {}", filePath.toStdString());
            }
        }
    }
    
    m_knownFiles.clear();
    for (const QFileInfo& file : files) {
        m_knownFiles.append(file.absoluteFilePath());
    }
}

} // namespace ClickFlash
