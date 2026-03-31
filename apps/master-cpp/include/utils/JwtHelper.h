#pragma once

#include <QString>
#include <QJsonObject>
#include <QMap>

namespace ClickFlash {

class JwtHelper {
public:
    static QString generateToken(const QJsonObject& payload);
    static bool validateToken(const QString& token);
    static QJsonObject parsePayload(const QString& token);
    static QString getError() { return m_lastError; }

private:
    static QString encodeBase64Url(const QByteArray& data);
    static QByteArray decodeBase64Url(const QString& data);
    static QString createSignature(const QString& header, const QString& payload);
    static bool verifySignature(const QString& header, const QString& payload, const QString& signature);

    static QString m_lastError;
};

} // namespace ClickFlash
