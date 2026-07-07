#pragma once

#include <QString>

namespace ClickFlash {

class PasswordHash {
public:
    static QString hash(const QString& password);
    static bool verify(const QString& password, const QString& hash);
    static QString getError() { return m_lastError; }

private:
    static QString hashBcrypt(const QString& password);
    static bool verifyBcrypt(const QString& password, const QString& hash);

    static QString m_lastError;
    static const int BCRYPT_ROUNDS = 12;
};

} // namespace ClickFlash
