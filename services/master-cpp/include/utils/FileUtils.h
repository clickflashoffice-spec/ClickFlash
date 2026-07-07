#pragma once

#include <QObject>
#include <QString>
#include <QFile>
#include <QDir>

namespace ClickFlash {

class FileUtils {
public:
    static bool ensureDirectory(const QString& path);
    static bool copyFile(const QString& from, const QString& to);
    static bool moveFile(const QString& from, const QString& to);
    static bool deleteFile(const QString& path);
    static qint64 getFileSize(const QString& path);
    static QString getFileName(const QString& path);
    static QString getFileExtension(const QString& path);
    static QString getBaseName(const QString& path);
    static QString getDirName(const QString& path);
    static bool exists(const QString& path);
    static QString readTextFile(const QString& path);
    static bool writeTextFile(const QString& path, const QString& content);
    static QStringList listFiles(const QString& dir, const QString& filter = "*");
    static QStringList listDirectories(const QString& dir);
    static qint64 getDirSize(const QString& path);
    static bool createSymLink(const QString& target, const QString& link);
    static QString resolveSymLink(const QString& path);
    static bool isAbsolute(const QString& path);
    static QString absolutePath(const QString& path);
    static QString relativePath(const QString& path, const QString& base);
};

} // namespace ClickFlash