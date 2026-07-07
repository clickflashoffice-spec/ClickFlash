#pragma once

#include <QObject>
#include <QTcpSocket>
#include "HttpRequest.h"
#include "HttpResponse.h"

namespace ClickFlash {

class RealtimeController : public QObject {
    Q_OBJECT

public:
    explicit RealtimeController(QObject* parent = nullptr);
    ~RealtimeController();

    void handleRequest(QTcpSocket* client, const HttpRequest& request);
    
signals:
    void clientSubscribed(const QString& clientId, const QString& event);
    void clientUnsubscribed(const QString& clientId, const QString& event);
    void eventPublished(const QString& event, const QString& data);

private:
    void sendEvent(QTcpSocket* client, const QString& event, const QByteArray& data);
    QString getClientId(QTcpSocket* client);
    
    QMap<QTcpSocket*, QSet<QString>> mSubscriptions;
};

} // namespace ClickFlash