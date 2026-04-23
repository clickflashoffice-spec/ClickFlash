#pragma once

#include "HttpServer.h"
#include <QObject>
#include <QTcpServer>
#include <QTcpSocket>
#include <QMap>
#include <QSet>

namespace ClickFlash {

class HttpServer : public QObject {
    Q_OBJECT

public:
    explicit HttpServer(QObject* parent = nullptr);
    ~HttpServer();
    
    void start(quint16 port = 8090);
    void stop();
    
    Router& router() { return m_router; }
    
    bool isRunning() const { return m_running; }
    quint16 port() const { return m_port; }

signals:
    void serverStarted(quint16 port);
    void serverStopped();
    void requestReceived(const QString& method, const QString& path);
    void clientConnected(const QString& address);
    void clientDisconnected(const QString& address);

private slots:
    void onNewConnection();
    void onSocketReadyRead();
    void onSocketDisconnected();

private:
    void handleRequest(QTcpSocket* socket);
    HttpRequest parseRequest(const QByteArray& data);
    void sendResponse(QTcpSocket* socket, const HttpResponse& response);
    QString getClientIp(QTcpSocket* socket) const;
    
    bool parseStatusLine(const QByteArray& line, QString& method, QString& path, QString& version);
    QVariantMap parseHeaders(const QList<QByteArray>& lines);
    QByteArray buildResponse(const HttpResponse& response);
    
    QTcpServer* m_server;
    Router m_router;
    QSet<QTcpSocket*> m_clients;
    QMap<QTcpSocket*, QByteArray> m_buffers;
    
    bool m_running;
    quint16 m_port;
};

} // namespace ClickFlash
