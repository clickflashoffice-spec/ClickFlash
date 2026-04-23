#include "utils/JwtHelper.h"
#include "core/Config.h"
#include <QCryptographicHash>
#include <QDateTime>
#include <QJsonDocument>

namespace ClickFlash {

QString JwtHelper::m_lastError;

QString JwtHelper::generateToken(const QJsonObject& payload) {
    QJsonObject header = QJsonObject{
        {"alg", "HS256"},
        {"typ", "JWT"}
    };

    QString headerJson = QJsonDocument(header).toJson(QJsonDocument::Compact);
    QString payloadJson = QJsonDocument(payload).toJson(QJsonDocument::Compact);

    QString headerB64 = encodeBase64Url(headerJson.toUtf8());
    QString payloadB64 = encodeBase64Url(payloadJson.toUtf8());

    QString signature = createSignature(headerB64, payloadB64);

    return QString("%1.%2.%3").arg(headerB64, payloadB64, signature);
}

bool JwtHelper::validateToken(const QString& token) {
    QStringList parts = token.split('.');
    if (parts.size() != 3) {
        m_lastError = "Invalid token format";
        return false;
    }

    QString headerB64 = parts[0];
    QString payloadB64 = parts[1];
    QString signature = parts[2];

    if (!verifySignature(headerB64, payloadB64, signature)) {
        m_lastError = "Invalid signature";
        return false;
    }

    QJsonObject payload = parsePayload(token);
    if (payload.isEmpty()) {
        m_lastError = "Invalid payload";
        return false;
    }

    if (payload.contains("exp")) {
        qint64 exp = payload["exp"].toDouble();
        if (QDateTime::currentMSecsSinceEpoch() / 1000 > exp) {
            m_lastError = "Token expired";
            return false;
        }
    }

    return true;
}

QJsonObject JwtHelper::parsePayload(const QString& token) {
    QStringList parts = token.split('.');
    if (parts.size() != 3) {
        return QJsonObject();
    }

    QByteArray payloadData = decodeBase64Url(parts[1]);
    QJsonParseError error;
    QJsonDocument doc = QJsonDocument::fromJson(payloadData, &error);

    if (error.error != QJsonParseError::NoError) {
        m_lastError = error.errorString();
        return QJsonObject();
    }

    return doc.object();
}

QString JwtHelper::encodeBase64Url(const QByteArray& data) {
    QByteArray encoded = data.toBase64();
    encoded = encoded.replace("+", "-");
    encoded = encoded.replace("/", "_");
    encoded = encoded.replace("=", "");
    return QString::fromLatin1(encoded);
}

QByteArray JwtHelper::decodeBase64Url(const QString& data) {
    QString padded = data;
    int remainder = data.length() % 4;
    if (remainder > 0) {
        padded += QString(4 - remainder, '=');
    }
    padded = padded.replace("-", "+");
    padded = padded.replace("_", "/");
    return QByteArray::fromBase64(padded.toLatin1());
}

QString JwtHelper::createSignature(const QString& header, const QString& payload) {
    QString secret = Config::instance().getJwtSecret();
    QString data = QString("%1.%2").arg(header, payload);

    QByteArray key = secret.toLatin1();
    QByteArray message = data.toLatin1();

    QByteArray hash = QCryptographicHash::hash(
        message,
        QCryptographicHash::Sha256
    );

    QByteArray signature = QCryptographicHash::hash(
        key + hash,
        QCryptographicHash::Sha256
    );

    return encodeBase64Url(signature);
}

bool JwtHelper::verifySignature(const QString& header, const QString& payload, const QString& signature) {
    QString expectedSignature = createSignature(header, payload);
    return expectedSignature == signature;
}

} // namespace ClickFlash
