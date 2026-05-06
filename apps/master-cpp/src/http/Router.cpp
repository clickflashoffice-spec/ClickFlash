#include "http/Router.h"
#include "http/HttpServer.h"
#include "http/Request.h"
#include "http/Response.h"
#include "core/Logger.h"
#include <QUrl>

namespace ClickFlash {

Router::Router(HttpServer* server, QObject* parent)
    : QObject(parent)
    , m_server(server)
{
}

void Router::get(const QString& path, RouteHandler handler, const QStringList& middleware) {
    addRoute("GET", path, handler, middleware);
}

void Router::post(const QString& path, RouteHandler handler, const QStringList& middleware) {
    addRoute("POST", path, handler, middleware);
}

void Router::put(const QString& path, RouteHandler handler, const QStringList& middleware) {
    addRoute("PUT", path, handler, middleware);
}

void Router::patch(const QString& path, RouteHandler handler, const QStringList& middleware) {
    addRoute("PATCH", path, handler, middleware);
}

void Router::delete_(const QString& path, RouteHandler handler, const QStringList& middleware) {
    addRoute("DELETE", path, handler, middleware);
}

void Router::options(const QString& path, RouteHandler handler, const QStringList& middleware) {
    addRoute("OPTIONS", path, handler, middleware);
}

void Router::addRoute(const QString& method, const QString& path, RouteHandler handler, const QStringList& middleware) {
    Route route;
    route.method = method.toUpper();
    route.path = path;
    route.handler = handler;
    route.middleware = middleware;
    
    // Convert path parameters to regex
    QString regexPattern = extractPathParams(path, regexPattern);
    route.regex.setPattern("^" + regexPattern + "$");
    route.regex.setPatternOptions(QRegularExpression::CaseInsensitiveOption);
    
    m_routes.append(route);
    
    CF_DEBUG("Route registered: {} {}", route.method.toStdString(), route.path.toStdString());
    emit routeRegistered(route.method, route.path);
}

void Router::handleRequest(Request& request, Response& response) {
    QString path = request.path();
    QString method = request.method();
    
    // Find matching route
    for (const Route& route : m_routes) {
        if (route.method != method && route.method != "*") {
            continue;
        }
        
        QRegularExpressionMatch match = route.regex.match(path);
        if (match.hasMatch()) {
            // Extract path parameters
            QStringList paramNames = m_pathParams.value(route.path);
            for (int i = 0; i < paramNames.size() && i + 1 < match.capturedTexts().size(); ++i) {
                request.setPathParam(paramNames[i], match.captured(i + 1));
            }
            
            // Run middleware
            for (const QString& mw : route.middleware) {
                // Middleware would be resolved here
            }
            
            // Execute handler
            try {
                route.handler(request, response);
            } catch (const std::exception& e) {
                CF_ERROR("Route handler error: {}", e.what());
                response.setStatus(500);
                response.setBody(QString("Internal server error: %1").arg(e.what()));
            }
            return;
        }
    }
    
    // No route found
    response.setStatus(404);
    response.setBody("{\"error\": \"Not Found\"}");
    response.setHeader("Content-Type", "application/json");
}

QString Router::extractPathParams(const QString& path, QString& regexPattern) {
    regexPattern = path;
    
    QRegularExpression paramRegex("\\{([^}]+)\\}");
    QRegularExpressionMatchIterator it = paramRegex.globalMatch(path);
    
    QStringList paramNames;
    while (it.hasNext()) {
        QRegularExpressionMatch match = it.next();
        QString paramName = match.captured(1);
        paramNames.append(paramName);
        
        regexPattern.replace(match.capturedStart(), match.capturedLength(), "([^/]+)");
    }
    
    m_pathParams[path] = paramNames;
    return regexPattern;
}

void Router::compileRoutes() {
    // Routes are compiled on-the-fly in addRoute
    CF_DEBUG("Routes compiled: {}", m_routes.size());
}

} // namespace ClickFlash