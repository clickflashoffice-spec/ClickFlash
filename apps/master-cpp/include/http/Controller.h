#pragma once

#include "http/Request.h"
#include "http/Response.h"
#include <QString>

namespace ClickFlash {

class Controller {
public:
    virtual ~Controller() = default;
    
    virtual void handleRequest(const HttpRequest& req, HttpResponse& res) = 0;
    
protected:
    static void sendJsonResponse(HttpResponse& res, const QVariantMap& data);
    static void sendError(HttpResponse& res, int code, const QString& message);
    static void sendSuccess(HttpResponse& res, const QString& message = "OK");
};

} // namespace ClickFlash
