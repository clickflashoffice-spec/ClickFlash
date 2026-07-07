#pragma once

#include "http/Controller.h"
#include <QObject>
#include <QString>

namespace ClickFlash {

class CullingController : public Controller {
    Q_OBJECT

public:
    explicit CullingController(QObject* parent = nullptr);
    
    void registerRoutes(class Router* router) override;
    
private:
    void startCullingSession(Request& request, Response& response);
    void getCullingSession(Request& request, Response& response);
    void submitCulling(Request& request, Response& response);
    void getCulledPhotos(Request& request, Response& response);
    void autoCull(Request& request, Response& response);
};

} // namespace ClickFlash