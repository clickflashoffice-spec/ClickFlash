#pragma once

#include <QObject>
#include <QString>
#include <QVariantMap>
#include <QJsonObject>
#include <QJsonValue>
#include <QDateTime>

namespace ClickFlash {

struct HttpRequest {
    QString method;
    QString path;
    QString query;
    QVariantMap headers;
    QJsonObject body;
    QVariantMap params;
    QString clientIp;
    QString userAgent;
    QString timestamp;

    QJsonValue getBodyField(const QString& key) const {
        return body.value(key);
    }

    QString getBodyString(const QString& key, const QString& defaultValue = QString()) const {
        return body.value(key).toString(defaultValue);
    }

    int getBodyInt(const QString& key, int defaultValue = 0) const {
        return body.value(key).toInt(defaultValue);
    }

    bool getBodyBool(const QString& key, bool defaultValue = false) const {
        return body.value(key).toBool(defaultValue);
    }

    double getBodyDouble(const QString& key, double defaultValue = 0.0) const {
        return body.value(key).toDouble(defaultValue);
    }

    bool hasBodyField(const QString& key) const {
        return body.contains(key);
    }
};

struct HttpResponse {
    int statusCode = 200;
    QString statusText = "OK";
    QVariantMap headers;
    QJsonObject body;
    QByteArray rawBody;

    void setStatus(int code, const QString& text = "") {
        statusCode = code;
        statusText = text.isEmpty() ? getDefaultStatusText(code) : text;
    }

    void setError(int code, const QString& message) {
        setStatus(code, getDefaultStatusText(code));
        body = QJsonObject{
            {"error", message},
            {"code", code}
        };
    }

    void setJson(const QJsonObject& data) {
        body = data;
        headers["Content-Type"] = "application/json";
    }

    void setHtml(const QString& html) {
        rawBody = html.toUtf8();
        headers["Content-Type"] = "text/html; charset=utf-8";
    }

    void setRedirect(const QString& location) {
        statusCode = 302;
        statusText = "Found";
        headers["Location"] = location;
    }

    void setNoContent() {
        statusCode = 204;
        statusText = "No Content";
    }

    static QString getDefaultStatusText(int code) {
        switch (code) {
            case 200: return "OK";
            case 201: return "Created";
            case 204: return "No Content";
            case 301: return "Moved Permanently";
            case 302: return "Found";
            case 304: return "Not Modified";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 405: return "Method Not Allowed";
            case 409: return "Conflict";
            case 422: return "Unprocessable Entity";
            case 429: return "Too Many Requests";
            case 500: return "Internal Server Error";
            case 502: return "Bad Gateway";
            case 503: return "Service Unavailable";
            default: return "Unknown";
        }
    }
};

} // namespace ClickFlash
