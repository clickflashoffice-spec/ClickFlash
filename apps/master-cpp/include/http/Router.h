#pragma once

#include "HttpServer.h"
#include <QObject>
#include <QString>
#include <QVector>
#include <memory>

namespace ClickFlash {

class Router : public QObject {
    Q_OBJECT

public:
    using RouteHandler = std::function<void(const HttpRequest&, HttpResponse&)>;
    
    Router() = default;
    
    void get(const QString& path, RouteHandler handler) {
        addRoute("GET", path, handler);
    }
    
    void post(const QString& path, RouteHandler handler) {
        addRoute("POST", path, handler);
    }
    
    void put(const QString& path, RouteHandler handler) {
        addRoute("PUT", path, handler);
    }
    
    void patch(const QString& path, RouteHandler handler) {
        addRoute("PATCH", path, handler);
    }
    
    void deleteRoute(const QString& path, RouteHandler handler) {
        addRoute("DELETE", path, handler);
    }
    
    void options(const QString& path, RouteHandler handler) {
        addRoute("OPTIONS", path, handler);
    }
    
    void use(const QString& path, RouteHandler handler) {
        addRoute("USE", path, handler);
    }
    
    void use(RouteHandler handler) {
        addRoute("USE", "*", handler);
    }

    bool matchRoute(const QString& method, const QString& path, 
                    RouteHandler& handler, QVariantMap& params) {
        
        for (const Route& route : m_routes) {
            if (route.method != method && route.method != "USE" && route.method != "*") {
                continue;
            }
            
            QRegExp regex(route.pattern);
            if (regex.exactMatch(path)) {
                handler = route.handler;
                params.clear();
                
                QStringList captures = regex.capturedTexts();
                for (int i = 0; i < route.paramNames.size() && i + 1 < captures.size(); ++i) {
                    params[route.paramNames[i]] = captures[i + 1];
                }
                
                return true;
            }
        }
        
        return false;
    }

private:
    void addRoute(const QString& method, const QString& path, RouteHandler handler) {
        m_routes.append(Route(method, path, handler));
    }
    
    QVector<Route> m_routes;
};

} // namespace ClickFlash
