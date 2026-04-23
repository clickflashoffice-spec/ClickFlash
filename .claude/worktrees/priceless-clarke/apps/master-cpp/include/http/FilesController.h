#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include <QFile>
#include <QDir>

namespace ClickFlash {

class FilesController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/files/*", handleServe);
        router.post("/api/files/upload", handleUpload);
    }
    
    static void handleServe(const HttpRequest& req, HttpResponse& res) {
        QString path = req.path;
        path = path.mid(11);
        
        QString dataDir = Config::instance().getDataDir();
        QString fullPath = dataDir + "/" + path;
        
        QFile file(fullPath);
        
        if (!file.exists()) {
            res.setError(404, "File not found");
            return;
        }
        
        if (!file.open(QIODevice::ReadOnly)) {
            res.setError(500, "Could not open file");
            return;
        }
        
        QByteArray data = file.readAll();
        file.close();
        
        QString extension = QFileInfo(fullPath).suffix().toLower();
        QString contentType = getContentType(extension);
        
        res.headers["Content-Type"] = contentType;
        res.headers["Content-Length"] = QString::number(data.size());
        res.rawBody = data;
        res.statusCode = 200;
    }
    
    static void handleUpload(const HttpRequest& req, HttpResponse& res) {
        QString filename = req.body.value("filename").toString();
        QString data = req.body.value("data").toString();
        QString category = req.body.value("category", "general").toString();
        
        if (filename.isEmpty() || data.isEmpty()) {
            res.setError(400, "filename and data are required");
            return;
        }
        
        QString dataDir = Config::instance().getDataDir() + "/" + category;
        QDir().mkpath(dataDir);
        
        QString fullPath = dataDir + "/" + filename;
        
        QFile file(fullPath);
        
        if (!file.open(QIODevice::WriteOnly)) {
            res.setError(500, "Could not write file");
            return;
        }
        
        file.write(QByteArray::fromBase64(data.toUtf8()));
        file.close();
        
        QString url = QString("/api/files/%1/%2").arg(category).arg(filename);
        
        res.setJson(QVariantMap({
            {"success", true},
            {"url", url},
            {"path", fullPath}
        }));
    }

private:
    static QString getContentType(const QString& extension) {
        static QMap<QString, QString> types = {
            {"jpg", "image/jpeg"},
            {"jpeg", "image/jpeg"},
            {"png", "image/png"},
            {"gif", "image/gif"},
            {"webp", "image/webp"},
            {"pdf", "application/pdf"},
            {"zip", "application/zip"}
        };
        
        return types.value(extension, "application/octet-stream");
    }
};

} // namespace ClickFlash
