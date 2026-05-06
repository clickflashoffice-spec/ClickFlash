#include "utils/FileUtils.h"
#include "core/Logger.h"

#include <QFileInfo>

namespace ClickFlash {

bool FileUtils::ensureDirectory(const QString& path) {
    QDir dir(path);
    if (dir.exists()) return true;
    return dir.mkpath(".");
}

bool FileUtils::copyFile(const QString& from, const QString& to) {
    if (!QFile::copy(from, to)) {
        CF_ERROR("Failed to copy file from {} to {}", from.toStdString(), to.toStdString());
        return false;
    }
    return true;
}

bool FileUtils::moveFile(const QString& from, const QString& to) {
    if (!QFile::rename(from, to)) {
        CF_ERROR("Failed to move file from {} to {}", from.toStdString(), to.toStdString());
        return false;
    }
    return true;
}

bool FileUtils::deleteFile(const QString& path) {
    if (!QFile::remove(path)) {
        CF_ERROR("Failed to delete file {}", path.toStdString());
        return false;
    }
    return true;
}

qint64 FileUtils::getFileSize(const QString& path) {
    QFileInfo info(path);
    return info.size();
}

QString FileUtils::getFileName(const QString& path) {
    QFileInfo info(path);
    return info.fileName();
}

QString FileUtils::getFileExtension(const QString& path) {
    QFileInfo info(path);
    return info.suffix();
}

QString FileUtils::getBaseName(const QString& path) {
    QFileInfo info(path);
    return info.baseName();
}

QString FileUtils::getDirName(const QString& path) {
    QFileInfo info(path);
    return info.dir().absolutePath();
}

bool FileUtils::exists(const QString& path) {
    return QFileInfo::exists(path);
}

QString FileUtils::readTextFile(const QString& path) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        CF_ERROR("Failed to open file for reading: {}", path.toStdString());
        return QString();
    }
    
    QTextStream stream(&file);
    QString content = stream.readAll();
    file.close();
    
    return content;
}

bool FileUtils::writeTextFile(const QString& path, const QString& content) {
    QFile file(path);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Text)) {
        CF_ERROR("Failed to open file for writing: {}", path.toStdString());
        return false;
    }
    
    QTextStream stream(&file);
    stream << content;
    file.close();
    
    return true;
}

QStringList FileUtils::listFiles(const QString& dir, const QString& filter) {
    QDir d(dir);
    d.setNameFilters(QStringList() << filter);
    d.setFilter(QDir::Files);
    
    QStringList files;
    for (const QFileInfo& info : d.entryInfoList()) {
        files.append(info.absoluteFilePath());
    }
    
    return files;
}

QStringList FileUtils::listDirectories(const QString& dir) {
    QDir d(dir);
    d.setFilter(QDir::Dirs | QDir::NoDotAndDotDot);
    
    QStringList dirs;
    for (const QFileInfo& info : d.entryInfoList()) {
        dirs.append(info.absoluteFilePath());
    }
    
    return dirs;
}

qint64 FileUtils::getDirSize(const QString& path) {
    qint64 size = 0;
    QDir dir(path);
    
    QFileInfoList entries = dir.entryInfoList(QDir::Files | QDir::Dirs | QDir::NoDotAndDotDot);
    for (const QFileInfo& info : entries) {
        if (info.isDir()) {
            size += getDirSize(info.absoluteFilePath());
        } else {
            size += info.size();
        }
    }
    
    return size;
}

bool FileUtils::createSymLink(const QString& target, const QString& link) {
#ifdef Q_OS_WIN
    // On Windows, requires administrator or developer mode
    return QFile::link(target, link);
#else
    return QFile::link(target, link);
#endif
}

QString FileUtils::resolveSymLink(const QString& path) {
    QFileInfo info(path);
    return info.symLinkTarget();
}

bool FileUtils::isAbsolute(const QString& path) {
    return QFileInfo(path).isAbsolute();
}

QString FileUtils::absolutePath(const QString& path) {
    return QFileInfo(path).absoluteFilePath();
}

QString FileUtils::relativePath(const QString& path, const QString& base) {
    return QFileInfo(path).relativeFilePath(base);
}

} // namespace ClickFlash