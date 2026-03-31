#include "http/Middleware.h"
#include "core/Logger.h"
#include "core/Config.h"
#include "utils/JwtHelper.h"
#include <QDateTime>
#include <QCryptographicHash>
#include <QDebug>

namespace ClickFlash {

AuthMiddleware::AuthMiddleware(QObject* parent)
    : Middleware("AuthMiddleware", parent)
{
}

void AuthMiddleware::handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) {
    QString token = extractToken(request);
    
    if (token.isEmpty()) {
        response.setError(401, "Authentication required");
        emit authenticationRequired();
        return;
    }
    
    if (!validateToken(token)) {
        response.setError(401, "Invalid or expired token");
        emit accessDenied("Invalid token");
        return;
    }
    
    next();
}

QString AuthMiddleware::extractToken(const HttpRequest& request) {
    QString authHeader = request.headers.value("authorization").toString();
    
    if (authHeader.startsWith("Bearer ", Qt::CaseInsensitive)) {
        return authHeader.mid(7).trimmed();
    }
    
    if (authHeader.startsWith("Bearer", Qt::CaseInsensitive)) {
        return authHeader.mid(6).trimmed();
    }
    
    return request.query.split('&')
        .filter([](const QString& param) { return param.startsWith("token="); })
        .value(0)
        .mid(6);
}

bool AuthMiddleware::validateToken(const QString& token) {
    return JwtHelper::validateToken(token);
}

CorsMiddleware::CorsMiddleware(QObject* parent)
    : Middleware("CorsMiddleware", parent)
    , m_allowedOrigins({"*"})
    , m_allowedMethods({"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"})
    , m_allowedHeaders({"Content-Type", "Authorization", "X-Requested-With", "X-Kiosk-ID", "X-Timestamp", "X-Signature"})
{
}

void CorsMiddleware::handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) {
    QString origin = request.headers.value("origin").toString();
    
    response.headers["Access-Control-Allow-Origin"] = m_allowedOrigins.contains("*") ? "*" : origin;
    response.headers["Access-Control-Allow-Methods"] = m_allowedMethods.join(", ");
    response.headers["Access-Control-Allow-Headers"] = m_allowedHeaders.join(", ");
    response.headers["Access-Control-Max-Age"] = "86400";
    
    if (request.method == "OPTIONS") {
        response.setStatus(204, "No Content");
        return;
    }
    
    next();
}

RateLimitMiddleware::RateLimitMiddleware(QObject* parent)
    : Middleware("RateLimitMiddleware", parent)
{
}

void RateLimitMiddleware::handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) {
    QString clientIp = request.clientIp;
    
    if (!checkRateLimit(clientIp)) {
        response.setError(429, "Too many requests");
        return;
    }
    
    next();
}

bool RateLimitMiddleware::checkRateLimit(const QString& clientIp) {
    qint64 now = QDateTime::currentMSecsSinceEpoch();
    
    if (m_requestCounts.contains(clientIp)) {
        auto& [count, windowStart] = m_requestCounts[clientIp];
        
        if (now - windowStart > m_windowMs) {
            count = 1;
            windowStart = now;
        } else {
            count++;
        }
        
        return count <= m_maxRequests;
    }
    
    m_requestCounts[clientIp] = {1, now};
    return true;
}

ValidationMiddleware::ValidationMiddleware(QObject* parent)
    : Middleware("ValidationMiddleware", parent)
{
}

void ValidationMiddleware::handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) {
    Q_UNUSED(response);
    
    for (const ValidationRule& rule : m_rules) {
        QJsonValue value = request.body.value(rule.field);
        
        if (!validateField(rule.field, rule.rule, value)) {
            next();
            return;
        }
    }
    
    next();
}

void ValidationMiddleware::addRule(const QString& field, const QString& rule) {
    m_rules.append({field, rule});
}

bool ValidationMiddleware::validateField(const QString& field, const QString& rule, const QJsonValue& value) {
    Q_UNUSED(field);
    
    if (rule == "required" && value.isNull()) {
        return false;
    }
    if (rule == "string" && !value.isString()) {
        return false;
    }
    if (rule == "number" && !value.isDouble()) {
        return false;
    }
    if (rule == "boolean" && !value.isBool()) {
        return false;
    }
    if (rule == "array" && !value.isArray()) {
        return false;
    }
    if (rule == "object" && !value.isObject()) {
        return false;
    }
    
    if (rule.startsWith("min:")) {
        bool ok;
        double min = rule.mid(4).toDouble(&ok);
        if (ok && value.toDouble() < min) {
            return false;
        }
    }
    
    if (rule.startsWith("max:")) {
        bool ok;
        double max = rule.mid(4).toDouble(&ok);
        if (ok && value.toDouble() > max) {
            return false;
        }
    }
    
    if (rule.startsWith("minLength:")) {
        int minLen = rule.mid(11).toInt();
        if (value.toString().length() < minLen) {
            return false;
        }
    }
    
    if (rule.startsWith("maxLength:")) {
        int maxLen = rule.mid(11).toInt();
        if (value.toString().length() > maxLen) {
            return false;
        }
    }
    
    if (rule == "email") {
        QString email = value.toString();
        return email.contains('@') && email.contains('.') && email.indexOf('@') < email.lastIndexOf('.');
    }
    
    if (rule == "uuid") {
        QString uuid = value.toString();
        return uuid.length() == 36 && uuid.count('-') == 4;
    }
    
    return true;
}

KioskAuthMiddleware::KioskAuthMiddleware(QObject* parent)
    : Middleware("KioskAuthMiddleware", parent)
{
}

void KioskAuthMiddleware::handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) {
    QString kioskId = request.headers.value("x-kiosk-id").toString();
    QString timestamp = request.headers.value("x-timestamp").toString();
    QString signature = request.headers.value("x-signature").toString();
    
    if (kioskId.isEmpty() || timestamp.isEmpty() || signature.isEmpty()) {
        response.setError(401, "Missing kiosk authentication headers");
        return;
    }
    
    if (!validateTimestamp(timestamp)) {
        response.setError(401, "Request timestamp expired or invalid");
        return;
    }
    
    if (!validateHmacSignature(request)) {
        response.setError(401, "Invalid HMAC signature");
        return;
    }
    
    next();
}

bool KioskAuthMiddleware::validateHmacSignature(const HttpRequest& request) {
    QString kioskId = request.headers.value("x-kiosk-id").toString();
    QString timestamp = request.headers.value("x-timestamp").toString();
    QString providedSignature = request.headers.value("x-signature").toString();
    
    QString signingSecret = Config::instance().getKioskSigningSecret();
    QString dataToSign = QString("%1:%2:%3").arg(kioskId, timestamp, request.path);
    
    QByteArray key = signingSecret.toLatin1();
    QByteArray data = dataToSign.toLatin1();
    
    QByteArray expectedSignature = QCryptographicHash::hash(
        data,
        QCryptographicHash::Sha256
    ).toBase64();
    
    return providedSignature == expectedSignature;
}

bool KioskAuthMiddleware::validateTimestamp(const QString& timestamp) {
    bool ok;
    qint64 ts = timestamp.toLongLong(&ok);
    
    if (!ok) {
        return false;
    }
    
    qint64 now = QDateTime::currentMSecsSinceEpoch();
    qint64 diff = qAbs(now - ts);
    
    const qint64 FIVE_MINUTES = 5 * 60 * 1000;
    return diff <= FIVE_MINUTES;
}

} // namespace ClickFlash
