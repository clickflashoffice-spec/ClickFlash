#include "services/RealtimeService.h"
#include "core/Logger.h"
#include <QUuid>
#include <QTimer>
#include <QDateTime>

namespace ClickFlash {

RealtimeService::RealtimeService(QObject* parent)
    : QObject(parent)
    , m_server(new QTcpServer(this))
    , m_port(8092)
{
    connect(m_server, &QTcpServer::newConnection, this, &RealtimeService::onNewConnection);
}

RealtimeService::~RealtimeService() {
    stop();
}

void RealtimeService::start(quint16 port) {
    m_port = port;

    if (m_server->listen(QHostAddress::Any, port)) {
        CF_INFO("Realtime service started on port {}", port);
    } else {
        CF_ERROR("Failed to start realtime service: {}", m_server->errorString().toStdString());
    }
}

void RealtimeService::stop() {
    for (auto it = m_clients.begin(); it != m_clients.end(); ++it) {
        if (it.value().socket) {
            it.value().socket->disconnectFromHost();
        }
    }
    m_clients.clear();
    m_authenticatedClients.clear();

    m_server->close();
    CF_INFO("Realtime service stopped");
}

void RealtimeService::broadcast(const QString& event, const QJsonObject& data) {
    QJsonObject message = QJsonObject{
        {"event", event},
        {"data", data},
        {"timestamp", QDateTime::currentDateTime().toString(Qt::ISODate)}
    };

    QString sseData = QString("data: %1\n\n").arg(QString(QJsonDocument(message).toJson(QJsonDocument::Compact)));

    for (auto it = m_clients.begin(); it != m_clients.end(); ++it) {
        if (it.value().socket && it.value().socket->isOpen()) {
            it.value().socket->write(sseData.toUtf8());
            it.value().socket->flush();
        }
    }

    CF_DEBUG("Broadcast event: {} to {} clients", event.toStdString(), m_clients.size());
}

void RealtimeService::sendToClient(const QString& clientId, const QString& event, const QJsonObject& data) {
    if (!m_authenticatedClients.contains(clientId)) {
        CF_WARN("Attempted to send to unauthenticated client: {}", clientId.toStdString());
        return;
    }

    QJsonObject message = QJsonObject{
        {"event", event},
        {"data", data},
        {"timestamp", QDateTime::currentDateTime().toString(Qt::ISODate)}
    };

    QString sseData = QString("data: %1\n\n").arg(QString(QJsonDocument(message).toJson(QJsonDocument::Compact)));

    for (auto it = m_clients.begin(); it != m_clients.end(); ++it) {
        if (it.value().clientId == clientId && it.value().socket && it.value().socket->isOpen()) {
            it.value().socket->write(sseData.toUtf8());
            it.value().socket->flush();
            CF_DEBUG("Sent event {} to client {}", event.toStdString(), clientId.toStdString());
            return;
        }
    }
}

void RealtimeService::addAuthenticatedClient(const QString& clientId, int userId) {
    m_authenticatedClients.insert(clientId);
    
    for (auto it = m_clients.begin(); it != m_clients.end(); ++it) {
        if (it.value().clientId == clientId) {
            it.value().authenticated = true;
            it.value().userId = userId;
            break;
        }
    }

    emit authenticated(clientId, userId);
    CF_INFO("Client authenticated: {} (userId: {})", clientId.toStdString(), userId);
}

void RealtimeService::removeClient(const QString& clientId) {
    m_authenticatedClients.remove(clientId);

    for (auto it = m_clients.begin(); it != m_clients.end(); ++it) {
        if (it.value().clientId == clientId) {
            m_clients.erase(it);
            break;
        }
    }

    emit clientDisconnected(clientId);
    CF_DEBUG("Client removed: {}", clientId.toStdString());
}

bool RealtimeService::isClientConnected(const QString& clientId) const {
    return m_authenticatedClients.contains(clientId);
}

int RealtimeService::getConnectedClientsCount() const {
    return m_authenticatedClients.size();
}

void RealtimeService::onNewConnection() {
    QTcpSocket* clientSocket = m_server->nextPendingConnection();

    QString clientId = QUuid::createUuid().toString(QUuid::WithoutBraces);

    ClientInfo info;
    info.socket = clientSocket;
    info.userId = 0;
    info.clientId = clientId;
    info.authenticated = false;

    m_clients[clientSocket] = info;

    connect(clientSocket, &QTcpSocket::readyRead, this, &RealtimeService::onClientReadyRead);
    connect(clientSocket, &QTcpSocket::disconnected, this, &RealtimeService::onClientDisconnected);

    emit clientConnected(clientId);
    CF_DEBUG("New client connection: {}", clientId.toStdString());
}

void RealtimeService::onClientReadyRead() {
    QTcpSocket* socket = qobject_cast<QTcpSocket*>(sender());
    if (!socket) return;

    QString clientId = getClientId(socket);
    QByteArray data = socket->readAll();
    QString request = QString::fromUtf8(data);

    if (request.startsWith("GET /sse")) {
        handleSseRequest(socket, "/sse");
    } else {
        CF_DEBUG("Received data from client {}: {}", clientId.toStdString(), request.left(100).toStdString());
    }
}

void RealtimeService::onClientDisconnected() {
    QTcpSocket* socket = qobject_cast<QTcpSocket*>(sender());
    if (!socket) return;

    QString clientId = getClientId(socket);
    removeClient(clientId);

    socket->deleteLater();
}

void RealtimeService::handleSseRequest(QTcpSocket* socket, const QString& path) {
    Q_UNUSED(path);

    QString clientId = getClientId(socket);

    QString response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: text/event-stream\r\n";
    response += "Cache-Control: no-cache\r\n";
    response += "Connection: keep-alive\r\n";
    response += "Access-Control-Allow-Origin: *\r\n";
    response += "\r\n";

    socket->write(response.toUtf8());
    socket->flush();

    QJsonObject welcomeEvent = QJsonObject{
        {"event", "connected"},
        {"data", QJsonObject{{"clientId", clientId}}}
    };
    QString sseData = QString("data: %1\n\n").arg(QString(QJsonDocument(welcomeEvent).toJson(QJsonDocument::Compact)));
    socket->write(sseData.toUtf8());
    socket->flush();

    CF_INFO("SSE connection established: {}", clientId.toStdString());
}

void RealtimeService::sendSseHeartbeat(QTcpSocket* socket) {
    QString heartbeat = ":\n\n";
    socket->write(heartbeat.toUtf8());
    socket->flush();
}

QString RealtimeService::getClientId(QTcpSocket* socket) {
    if (m_clients.contains(socket)) {
        return m_clients[socket].clientId;
    }
    return QString();
}

} // namespace ClickFlash
