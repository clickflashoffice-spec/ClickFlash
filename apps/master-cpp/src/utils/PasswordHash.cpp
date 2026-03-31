#include "utils/PasswordHash.h"
#include <QCryptographicHash>
#include <QDateTime>
#include <QRandomGenerator>

namespace ClickFlash {

QString PasswordHash::m_lastError;

QString PasswordHash::hash(const QString& password) {
    return hashBcrypt(password);
}

bool PasswordHash::verify(const QString& password, const QString& hash) {
    if (hash.startsWith("$2")) {
        return verifyBcrypt(password, hash);
    }
    
    QString hashed = hashBcrypt(password);
    return hashed == hash;
}

QString PasswordHash::hashBcrypt(const QString& password) {
    QString saltPrefix = "$2a$12$";
    
    QByteArray randomBytes(16);
    for (int i = 0; i < 16; ++i) {
        randomBytes[i] = QRandomGenerator::global()->bounded(256);
    }
    
    QString salt = saltPrefix + QString::fromLatin1(randomBytes.toBase64());
    
    QString data = password + salt;
    QByteArray hash = QCryptographicHash::hash(data.toLatin1(), QCryptographicHash::Sha256);
    
    for (int i = 0; i < 4; ++i) {
        data = QString::fromLatin1(hash.toHex()) + password;
        hash = QCryptographicHash::hash(data.toLatin1(), QCryptographicHash::Sha256);
    }
    
    for (int i = 0; i < 4; ++i) {
        data = password + QString::fromLatin1(hash.toHex());
        hash = QCryptographicHash::hash(data.toLatin1(), QCryptographicHash::Sha256);
    }
    
    return salt + QString::fromLatin1(hash.toHex());
}

bool PasswordHash::verifyBcrypt(const QString& password, const QString& hash) {
    if (hash.length() < 60) {
        m_lastError = "Invalid hash length";
        return false;
    }
    
    QString salt = hash.left(60);
    QString computedHash = hashBcrypt(password);
    
    return computedHash == hash;
}

} // namespace ClickFlash
