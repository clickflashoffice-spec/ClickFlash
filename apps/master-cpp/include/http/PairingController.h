#pragma once

#include "http/Controller.h"
#include <QObject>
#include <QString>

namespace ClickFlash {

class PairingController : public Controller {
    Q_OBJECT

public:
    explicit PairingController(QObject* parent = nullptr);
    
    void registerRoutes(class Router* router) override;
    
private:
    void initiatePairing(Request& request, Response& response);
    void confirmPairing(Request& request, Response& response);
    void getPairedDevices(Request& request, Response& response);
    void unpairDevice(Request& request, Response& response);
    void getPairingStatus(Request& request, Response& response);
    void renewPairing(Request& request, Response& response);
};

} // namespace ClickFlash