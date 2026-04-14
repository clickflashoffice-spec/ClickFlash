#pragma once

#include <QObject>
#include <QString>
#include <QMap>
#include <QList>
#include <QRegularExpression>
#include <functional>

namespace ClickFlash {

class HttpServer;

using RouteHandler = std::function<void(class Request&, class Response&)>;

struct Route {
    QString method;
    QString path;
    QRegularExpression regex;
    RouteHandler handler;
    QStringList middleware;
};

class Router : public QObject {
    Q_OBJECT

public:
    explicit Router(HttpServer* server, QObject* parent = nullptr);
    
    void get(const QString& path, RouteHandler handler, const QStringList& middleware = {});
    void post(const QString& path, RouteHandler handler, const QStringList& middleware = {});
    void put(const QString& path, RouteHandler handler, const QStringList& middleware = {});
    void patch(const QString& path, RouteHandler handler, const QStringList& middleware = {});
    void delete_(const QString& path, RouteHandler handler, const QStringList& middleware = {});
    void options(const QString& path, RouteHandler handler, const QStringList& middleware = {});
    
    void handleRequest(class Request& request, class Response& response);
    
    void addRoute(const QString& method, const QString& path, RouteHandler handler, const QStringList& middleware = {});
    
signals:
    void routeRegistered(const QString& method, const QString& path);

private:
    void compileRoutes();
    QString extractPathParams(const QString& path, QString& regexPattern);
    
    HttpServer* m_server;
    QList<Route> m_routes;
    QMap<QString, QStringList> m_pathParams;
};

} // namespace ClickFlash