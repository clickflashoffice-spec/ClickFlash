#pragma once

#include <QString>
#include <QJsonObject>

namespace ClickFlash {

class LanSigning {
public:
    static QString signRequest(const QString& kioskId, const QString& timestamp, const QString& path);
    static bool verifySignature(const QString& kioskId, const QString& timestamp, const QString& path, const QString& signature);
    static bool validateTimestamp(const QString& timestamp);
    static QString getCurrentTimestamp();
    static QString generatePairingToken();
    static QString generateSigningSecret();

    static QString getError() { return m_lastError; }

private:
    static QString m_lastError;
    static const qint64 TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;
};

} // namespace ClickFlash
