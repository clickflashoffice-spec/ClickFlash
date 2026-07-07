#include "utils/LanSigning.h"
#include "core/Config.h"
#include <QCryptographicHash>
#include <QDateTime>
#include <QUuid>
#include <QDebug>

namespace ClickFlash {

QString LanSigning::m_lastError;

QString LanSigning::signRequest(const QString& kioskId, const QString& timestamp, const QString& path) {
    QString signingSecret = Config::instance().getKioskSigningSecret();
    QString dataToSign = QString("%1:%2:%3").arg(kioskId, timestamp, path);

    QByteArray key = signingSecret.toLatin1();
    QByteArray data = dataToSign.toLatin1();

    QByteArray hash = QCryptographicHash::hash(data, QCryptographicHash::Sha256);
    return hash.toBase64();
}

bool LanSigning::verifySignature(const QString& kioskId, const QString& timestamp, const QString& path, const QString& signature) {
    QString expectedSignature = signRequest(kioskId, timestamp, path);
    
    if (expectedSignature != signature) {
        m_lastError = "Signature mismatch";
        return false;
    }
    
    return true;
}

bool LanSigning::validateTimestamp(const QString& timestamp) {
    bool ok;
    qint64 ts = timestamp.toLongLong(&ok);
    
    if (!ok) {
        m_lastError = "Invalid timestamp format";
        return false;
    }
    
    qint64 now = QDateTime::currentMSecsSinceEpoch();
    qint64 diff = qAbs(now - ts);
    
    if (diff > TIMESTAMP_WINDOW_MS) {
        m_lastError = "Timestamp outside acceptable window";
        return false;
    }
    
    return true;
}

QString LanSigning::getCurrentTimestamp() {
    return QString::number(QDateTime::currentMSecsSinceEpoch());
}

QString LanSigning::generatePairingToken() {
    return QUuid::createUuid().toString(QUuid::WithoutBraces).toUpper().left(8);
}

QString LanSigning::generateSigningSecret() {
    QByteArray bytes(32);
    for (int i = 0; i < 32; ++i) {
        bytes[i] = QRandomGenerator::global()->bounded(256);
    }
    return QString::fromLatin1(bytes.toBase64());
}

} // namespace ClickFlash
