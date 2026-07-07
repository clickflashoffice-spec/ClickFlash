#pragma once

#include "http/Controller.h"
#include <QObject>
#include <QString>

namespace ClickFlash {

class FacesController : public Controller {
    Q_OBJECT

public:
    explicit FacesController(QObject* parent = nullptr);
    
    void registerRoutes(class Router* router) override;
    
private:
    void detectFaces(Request& request, Response& response);
    void getFaces(Request& request, Response& response);
    void getFace(Request& request, Response& response);
    void deleteFace(Request& request, Response& response);
    void trainModel(Request& request, Response& response);
    void getSimilar(Request& request, Response& response);
};

} // namespace ClickFlash