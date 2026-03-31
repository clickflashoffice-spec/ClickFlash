#pragma once

#include <QString>
#include <QVariantMap>
#include <QMap>

namespace ClickFlash {

class HttpResponse {
public:
    HttpResponse();
    
    void setStatus(int code, const QString& text);
    void setJson(const QVariantMap& body);
    void setError(int code, const QString& message);
    void setHeader(const QString& key, const QString& value);
    void setRawBody(const QByteArray& body);
    
    int statusCode() const { return m_statusCode; }
    QString statusText() const { return m_statusText; }
    QVariantMap body() const { return m_body; }
    QMap<QString, QVariant> headers() const { return m_headers; }
    QByteArray rawBody() const { return m_rawBody; }

private:
    int m_statusCode;
    QString m_statusText;
    QVariantMap m_body;
    QMap<QString, QVariant> m_headers;
    QByteArray m_rawBody;
};

} // namespace ClickFlash
