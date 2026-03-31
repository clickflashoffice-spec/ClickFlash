#include "http/Controller.h"

namespace ClickFlash {

void Controller::sendJsonResponse(HttpResponse& res, const QVariantMap& data) {
    res.setJson(data);
}

void Controller::sendError(HttpResponse& res, int code, const QString& message) {
    res.setError(code, message);
}

void Controller::sendSuccess(HttpResponse& res, const QString& message) {
    res.setJson(QVariantMap{{"success", true}, {"message", message}});
}

} // namespace ClickFlash
