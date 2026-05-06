#include "RealtimeController.h"
#include "Logger.h"
#include <QJsonDocument>
#include <QJsonObject>

namespace ClickFlash {

RealtimeController::RealtimeController(QObject* parent)
    : QObject(parent)
{
    CF_INFO("RealtimeController initialized");
}

RealtimeController::~RealtimeController() {
    CF_INFO("RealtimeController shutting down");
}

void RealtimeController::handleRequest(QTcpSocket* client, const HttpRequest& request) {
    if (request.path == "/api/realtime/subscribe") {
        QString event = request.queryParams.value("event", "default");
        mSubscriptions[client].insert(event);
        emit clientSubscribed(getClientId(client), event);
        
        QJsonObject response;
        response["type"] = "subscribed";
        response["event"] = event;
        sendEvent(client, "subscription", QJsonDocument(response).toJson(QJsonDocument::Compact));
        
        CF_INFO("Client {} subscribed to {}", getClientId(client).toStdString(), event.toStdString());
    }
    else if (request.path == "/api/realtime/unsubscribe") {
        QString event = request.queryParams.value("event", "default");
        if (mSubscriptions.contains(client)) {
            mSubscriptions[client].remove(event);
            emit clientUnsubscribed(getClientId(client), event);
            
            QJsonObject response;
            response["type"] = "unsubscribed";
            response["event"] = event;
            sendEvent(client, "subscription", QJsonDocument(response).toJson(QJsonDocument::Compact));
        }
    }
    else if (request.path == "/api/realtime/publish") {
        QString event = request.queryParams.value("event", "default");
        emit eventPublished(event, QString::fromUtf8(request.body));
        
        QJsonObject broadcast;
        broadcast["type"] = "event";
        broadcast["event"] = event;
        broadcast["data"] = QString::fromUtf8(request.body);
        
        QByteArray data = QJsonDocument(broadcast).toJson(QJsonDocument::Compact);
        for (auto* socket : mSubscriptions.keys()) {
            if (mSubscriptions[socket].contains(event) || mSubscriptions[socket].contains("*")) {
                sendEvent(socket, event, data);
            }
        }
    }
}

void RealtimeController::sendEvent(QTcpSocket* client, const QString& event, const QByteArray& data) {
    HttpResponse response;
    response.setStatus(200, "OK");
    response.headers["Content-Type"] = "text/event-stream";
    response.headers["Cache-Control"] = "no-cache";
    response.headers["Connection"] = "keep-alive";
    response.headers["Access-Control-Allow-Origin"] = "*";
    
    QByteArray sse = QString("event: %1\ndata: %2\n\n").arg(event, QString::fromUtf8(data)).toUtf8();
    response.body = sse;
    
    client->write(response.toByteArray());
    client->flush();
}

QString RealtimeController::getClientId(QTcpSocket* client) {
    return QString("client_%1").arg(reinterpret_cast<quint64>(client), 16, 16);
}

} // namespace ClickFlash