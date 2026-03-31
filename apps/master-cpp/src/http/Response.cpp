#include "http/Response.h"

namespace ClickFlash {

HttpResponse::HttpResponse()
    : m_statusCode(200), m_statusText("OK") {}

void HttpResponse::setStatus(int code, const QString& text) {
    m_statusCode = code;
    m_statusText = text;
}

void HttpResponse::setJson(const QVariantMap& body) {
    m_body = body;
    m_headers["Content-Type"] = "application/json";
}

void HttpResponse::setError(int code, const QString& message) {
    m_statusCode = code;
    m_statusText = "Error";
    m_body = QVariantMap{{"error", message}};
    m_headers["Content-Type"] = "application/json";
}

void HttpResponse::setHeader(const QString& key, const QString& value) {
    m_headers[key] = value;
}

void HttpResponse::setRawBody(const QByteArray& body) {
    m_rawBody = body;
}

} // namespace ClickFlash
