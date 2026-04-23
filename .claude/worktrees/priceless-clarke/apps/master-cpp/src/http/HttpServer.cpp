#include "http/HttpServer.h"
#include "core/Logger.h"
#include "http/JsonHelper.h"

namespace ClickFlash {

HttpServer::HttpServer(QObject* parent)
    : QObject(parent)
    , m_server(new QTcpServer(this))
    , m_running(false)
    , m_port(8090)
{
    connect(m_server, &QTcpServer::newConnection, this, &HttpServer::onNewConnection);
}

HttpServer::~HttpServer() {
    stop();
}

void HttpServer::start(quint16 port) {
    m_port = port;
    
    if (m_server->listen(QHostAddress::Any, port)) {
        m_running = true;
        CF_INFO("HTTP server started on port {}", port);
        emit serverStarted(port);
    } else {
        CF_CRITICAL("Failed to start HTTP server on port {}: {}", 
                    port, m_server->errorString().toStdString());
    }
}

void HttpServer::stop() {
    for (QTcpSocket* client : m_clients) {
        client->disconnectFromHost();
    }
    m_clients.clear();
    
    m_server->close();
    m_running = false;
    
    CF_INFO("HTTP server stopped");
    emit serverStopped();
}

void HttpServer::onNewConnection() {
    QTcpSocket* client = m_server->nextPendingConnection();
    m_clients.insert(client);
    
    connect(client, &QTcpSocket::readyRead, this, &HttpServer::onSocketReadyRead);
    connect(client, &QTcpSocket::disconnected, this, &HttpServer::onSocketDisconnected);
    
    emit clientConnected(getClientIp(client));
}

void HttpServer::onSocketReadyRead() {
    QTcpSocket* socket = qobject_cast<QTcpSocket*>(sender());
    if (!socket) return;
    
    m_buffers[socket].append(socket->readAll());
    
    QByteArray& buffer = m_buffers[socket];
    
    int headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd == -1) return;
    
    QByteArray headerData = buffer.left(headerEnd);
    QByteArray bodyData = buffer.mid(headerEnd + 4);
    
    HttpRequest request;
    QString method, path, version;
    
    QList<QByteArray> lines = headerData.split('\n');
    if (lines.isEmpty()) return;
    
    if (!parseStatusLine(lines.first(), method, path, version)) {
        return;
    }
    
    request.method = method;
    
    int queryStart = path.indexOf('?');
    if (queryStart != -1) {
        request.path = path.left(queryStart);
        request.query = path.mid(queryStart + 1);
    } else {
        request.path = path;
    }
    
    QVariantMap headers = parseHeaders(lines.mid(1));
    request.headers = headers;
    request.clientIp = getClientIp(socket);
    
    if (request.method == "POST" || request.method == "PUT" || request.method == "PATCH") {
        QString contentLength = headers.value("content-length").toString();
        if (!contentLength.isEmpty()) {
            int len = contentLength.toInt();
            if (bodyData.size() < len) {
                return;
            }
            bodyData = bodyData.left(len);
            
            QString contentType = headers.value("content-type").toString();
            if (contentType.contains("application/json")) {
                QString error;
                request.body = JsonHelper::parseJson(bodyData, &error);
                if (!error.isEmpty()) {
                    CF_WARN("Failed to parse JSON body: {}", error.toStdString());
                }
            }
        }
    }
    
    buffer.clear();
    m_buffers.remove(socket);
    
    emit requestReceived(request.method, request.path);
    
    HttpResponse response;
    QVariantMap params;
    RouteHandler handler;
    
    if (m_router.matchRoute(request.method, request.path, handler, params)) {
        request.params = params;
        
        try {
            handler(request, response);
        } catch (const std::exception& e) {
            CF_ERROR("Route handler error: {}", e.what());
            response.setError(500, e.what());
        }
    } else {
        response.setError(404, "Route not found");
    }
    
    sendResponse(socket, response);
}

void HttpServer::onSocketDisconnected() {
    QTcpSocket* socket = qobject_cast<QTcpSocket*>(sender());
    if (socket) {
        m_clients.remove(socket);
        m_buffers.remove(socket);
        emit clientDisconnected(getClientIp(socket));
        socket->deleteLater();
    }
}

void HttpServer::sendResponse(QTcpSocket* socket, const HttpResponse& response) {
    QByteArray responseData = buildResponse(response);
    socket->write(responseData);
    socket->flush();
    socket->disconnectFromHost();
}

QString HttpServer::getClientIp(QTcpSocket* socket) const {
    return socket->peerAddress().toString();
}

bool HttpServer::parseStatusLine(const QByteArray& line, QString& method, QString& path, QString& version) {
    QString lineStr = QString::fromLatin1(line).trimmed();
    QStringList parts = lineStr.split(' ');
    
    if (parts.size() < 3) return false;
    
    method = parts[0];
    path = parts[1];
    version = parts[2];
    
    return true;
}

QVariantMap HttpServer::parseHeaders(const QList<QByteArray>& lines) {
    QVariantMap headers;
    
    for (const QByteArray& line : lines) {
        QString lineStr = QString::fromLatin1(line).trimmed();
        if (lineStr.isEmpty()) break;
        
        int colonIndex = lineStr.indexOf(':');
        if (colonIndex == -1) continue;
        
        QString key = lineStr.left(colonIndex).trimmed().toLower();
        QString value = lineStr.mid(colonIndex + 1).trimmed();
        headers[key] = value;
    }
    
    return headers;
}

QByteArray HttpServer::buildResponse(const HttpResponse& response) {
    QByteArray body;
    
    if (response.headers.value("Content-Type").toString().contains("application/json")) {
        body = JsonHelper::toJsonBytes(response.body);
    } else if (!response.rawBody.isEmpty()) {
        body = response.rawBody;
    } else {
        body = JsonHelper::toJsonBytes(response.body);
    }
    
    QString responseLine = QString("HTTP/1.1 %1 %2\r\n")
        .arg(response.statusCode)
        .arg(response.statusText);
    
    QByteArray headers;
    headers.append(responseLine.toLatin1());
    
    headers.append("Content-Length: ");
    headers.append(QByteArray::number(body.size()));
    headers.append("\r\n");
    
    headers.append("Access-Control-Allow-Origin: *\r\n");
    headers.append("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\n");
    headers.append("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With\r\n");
    
    for (auto it = response.headers.constBegin(); it != response.headers.constEnd(); ++it) {
        headers.append(QString("%1: %2\r\n").arg(it.key()).arg(it.value().toString()).toLatin1());
    }
    
    headers.append("\r\n");
    
    return headers + body;
}

} // namespace ClickFlash
