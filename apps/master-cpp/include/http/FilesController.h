#pragma once

#include "http/Controller.h"
#include <QObject>
#include <QString>

namespace ClickFlash {

class FilesController : public Controller {
    Q_OBJECT

public:
    explicit FilesController(QObject* parent = nullptr);
    
    void registerRoutes(class Router* router) override;
    
private:
    void uploadFile(Request& request, Response& response);
    void downloadFile(Request& request, Response& response);
    void deleteFile(Request& request, Response& response);
    void listFiles(Request& request, Response& response);
    void getFileInfo(Request& request, Response& response);
    void generateThumbnail(Request& request, Response& response);
    void processPhoto(Request& request, Response& response);
};

} // namespace ClickFlash