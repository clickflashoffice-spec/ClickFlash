#pragma once

#include "Request.h"
#include <QObject>
#include <QString>
#include <QVector>
#include <functional>

namespace ClickFlash {

using MiddlewareHandler = std::function<void(const HttpRequest&, HttpResponse&, std::function<void()>)>;

class Middleware {
public:
    Middleware(const QString& name) : m_name(name) {}

    virtual void handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) {
        Q_UNUSED(request);
        Q_UNUSED(response);
        next();
    }

    QString name() const { return m_name; }

protected:
    QString m_name;
};

class AuthMiddleware : public Middleware {
    Q_OBJECT
public:
    AuthMiddleware(QObject* parent = nullptr);

    void handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) override;

signals:
    void authenticationRequired();
    void accessDenied(const QString& reason);

private:
    bool validateToken(const QString& token);
    QString extractToken(const HttpRequest& request);
};

class CorsMiddleware : public Middleware {
    Q_OBJECT
public:
    CorsMiddleware(QObject* parent = nullptr);

    void handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) override;

    void setAllowedOrigins(const QStringList& origins) { m_allowedOrigins = origins; }
    void setAllowedMethods(const QStringList& methods) { m_allowedMethods = methods; }
    void setAllowedHeaders(const QStringList& headers) { m_allowedHeaders = headers; }

private:
    QStringList m_allowedOrigins;
    QStringList m_allowedMethods;
    QStringList m_allowedHeaders;
};

class RateLimitMiddleware : public Middleware {
    Q_OBJECT
public:
    RateLimitMiddleware(QObject* parent = nullptr);

    void handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) override;

    void setMaxRequests(int max) { m_maxRequests = max; }
    void setWindowMs(int ms) { m_windowMs = ms; }

private:
    bool checkRateLimit(const QString& clientIp);
    
    int m_maxRequests = 100;
    int m_windowMs = 60000;
    QMap<QString, QPair<int, qint64>> m_requestCounts;
};

class ValidationMiddleware : public Middleware {
    Q_OBJECT
public:
    ValidationMiddleware(QObject* parent = nullptr);

    void handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) override;

    void addRule(const QString& field, const QString& rule);

private:
    bool validateField(const QString& field, const QString& rule, const QJsonValue& value);

    struct ValidationRule {
        QString field;
        QString rule;
    };
    QVector<ValidationRule> m_rules;
};

class KioskAuthMiddleware : public Middleware {
    Q_OBJECT
public:
    KioskAuthMiddleware(QObject* parent = nullptr);

    void handle(const HttpRequest& request, HttpResponse& response, std::function<void()> next) override;

private:
    bool validateHmacSignature(const HttpRequest& request);
    bool validateTimestamp(const QString& timestamp);
    bool checkReplayAttack(const QString& kioskId, const QString& timestamp);
};

class MiddlewareChain {
public:
    void add(Middleware* middleware) {
        m_middlewares.append(middleware);
    }

    void run(const HttpRequest& request, HttpResponse& response, std::function<void()> finalHandler) {
        std::function<void(int)> chain = [&](int index) {
            if (index >= m_middlewares.size()) {
                finalHandler();
                return;
            }
            m_middlewares[index]->handle(request, response, [&, index]() {
                chain(index + 1);
            });
        };
        chain(0);
    }

private:
    QVector<Middleware*> m_middlewares;
};

} // namespace ClickFlash
