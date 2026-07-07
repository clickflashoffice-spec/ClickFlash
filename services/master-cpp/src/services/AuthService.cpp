#include "services/AuthService.h"
#include "core/Logger.h"
#include "core/Config.h"
#include "utils/PasswordHash.h"
#include "utils/JwtHelper.h"
#include <QUuid>
#include <QDateTime>

namespace ClickFlash {

QJsonObject AuthService::login(const QString& email, const QString& password, const QString& ipAddress) {
    QJsonObject result;

    DatabaseManager& db = DatabaseManager::instance();

    auto userResult = db.executeQuery(
        "SELECT id, uuid, email, password_hash, name, role, avatar_url, active FROM users WHERE email = :email",
        {{"email", email}}
    );

    if (userResult.isEmpty()) {
        db.execute(
            "INSERT INTO login_history (email, ip_address, success, failure_reason, created_at) VALUES (:email, :ip, 0, 'user_not_found', :now)",
            {{"email", email}, {"ip", ipAddress}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
        );
        CF_WARN("Login failed: user not found - {}", email.toStdString());
        return result;
    }

    int userId = userResult.value("id").toInt();
    QString storedHash = userResult.value("password_hash").toString();
    bool active = userResult.value("active").toInt() == 1;

    if (!active) {
        db.execute(
            "INSERT INTO login_history (user_id, email, ip_address, success, failure_reason, created_at) VALUES (:userId, :email, :ip, 0, 'account_inactive', :now)",
            {{"userId", userId}, {"email", email}, {"ip", ipAddress}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
        );
        CF_WARN("Login failed: account inactive - {}", email.toStdString());
        return result;
    }

    if (!verifyPassword(password, storedHash)) {
        db.execute(
            "INSERT INTO login_history (user_id, email, ip_address, success, failure_reason, created_at) VALUES (:userId, :email, :ip, 0, 'invalid_password', :now)",
            {{"userId", userId}, {"email", email}, {"ip", ipAddress}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
        );
        CF_WARN("Login failed: invalid password - {}", email.toStdString());
        return result;
    }

    QString token = generateToken();
    QString tokenHash = QString::fromLatin1(QCryptographicHash::hash(token.toLatin1(), QCryptographicHash::Sha256).toHex());

    QDateTime expires = QDateTime::currentDateTime().addDays(Config::instance().getJwtExpiryDays());
    QString expiresAt = expires.toString(Qt::ISODate);

    db.execute(
        "INSERT INTO sessions (uuid, user_id, token_hash, expires_at, ip_address, created_at) VALUES (:uuid, :userId, :tokenHash, :expires, :ip, :now)",
        {
            {"uuid", QUuid::createUuid().toString(QUuid::WithoutBraces)},
            {"userId", userId},
            {"tokenHash", tokenHash},
            {"expires", expiresAt},
            {"ip", ipAddress},
            {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}
        }
    );

    db.execute(
        "INSERT INTO login_history (user_id, email, ip_address, success, created_at) VALUES (:userId, :email, :ip, 1, :now)",
        {{"userId", userId}, {"email", email}, {"ip", ipAddress}, {"now", QDateTime::currentDateTime().toString(Qt::ISODate)}}
    );

    QJsonObject payload = QJsonObject{
        {"userId", userId},
        {"uuid", userResult.value("uuid").toString()},
        {"email", email},
        {"role", userResult.value("role").toString()},
        {"exp", expires.toSecsSinceEpoch()}
    };

    QString jwtToken = JwtHelper::generateToken(payload);

    result = QJsonObject{
        {"token", jwtToken},
        {"expiresAt", expiresAt},
        {"user", QJsonObject{
            {"id", userId},
            {"uuid", userResult.value("uuid").toString()},
            {"email", email},
            {"name", userResult.value("name").toString()},
            {"role", userResult.value("role").toString()},
            {"avatarUrl", userResult.value("avatar_url").toString()}
        }}
    };

    CF_INFO("User logged in: {}", email.toStdString());
    return result;
}

QJsonObject AuthService::registerUser(const QJsonObject& userData) {
    QJsonObject result;

    QString email = userData.value("email").toString();
    QString password = userData.value("password").toString();
    QString name = userData.value("name").toString();
    QString role = userData.value("role").toString("Photographer");

    if (email.isEmpty() || password.isEmpty() || name.isEmpty()) {
        CF_WARN("Registration failed: missing required fields");
        return result;
    }

    DatabaseManager& db = DatabaseManager::instance();

    auto existingUser = db.executeQuery(
        "SELECT id FROM users WHERE email = :email",
        {{"email", email}}
    );

    if (!existingUser.isEmpty()) {
        CF_WARN("Registration failed: email already exists - {}", email.toStdString());
        return result;
    }

    QString passwordHash = hashPassword(password);
    QString uuid = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString now = QDateTime::currentDateTime().toString(Qt::ISODate);

    db.execute(
        "INSERT INTO users (uuid, email, password_hash, name, role, active, created_at, updated_at) VALUES (:uuid, :email, :passwordHash, :name, :role, 1, :now, :now)",
        {
            {"uuid", uuid},
            {"email", email},
            {"passwordHash", passwordHash},
            {"name", name},
            {"role", role},
            {"now", now}
        }
    );

    QString lastId = db.lastInsertId();

    result = QJsonObject{
        {"id", lastId.toInt()},
        {"uuid", uuid},
        {"email", email},
        {"name", name},
        {"role", role}
    };

    CF_INFO("User registered: {}", email.toStdString());
    return result;
}

bool AuthService::logout(const QString& token) {
    DatabaseManager& db = DatabaseManager::instance();

    QString tokenHash = QString::fromLatin1(QCryptographicHash::hash(token.toLatin1(), QCryptographicHash::Sha256).toHex());

    bool success = db.execute(
        "DELETE FROM sessions WHERE token_hash = :tokenHash",
        {{"tokenHash", tokenHash}}
    );

    if (success) {
        CF_INFO("User logged out");
    }

    return success;
}

QJsonObject AuthService::validateSession(const QString& token) {
    if (!JwtHelper::validateToken(token)) {
        return QJsonObject();
    }

    return JwtHelper::parsePayload(token);
}

QJsonObject AuthService::getCurrentUser(const QString& token) {
    QJsonObject payload = validateSession(token);
    if (payload.isEmpty()) {
        return QJsonObject();
    }

    int userId = payload.value("userId").toInt();

    DatabaseManager& db = DatabaseManager::instance();

    auto userResult = db.executeQuery(
        "SELECT id, uuid, email, name, role, avatar_url FROM users WHERE id = :id",
        {{"id", userId}}
    );

    if (userResult.isEmpty()) {
        return QJsonObject();
    }

    return QJsonObject{
        {"id", userResult.value("id").toInt()},
        {"uuid", userResult.value("uuid").toString()},
        {"email", userResult.value("email").toString()},
        {"name", userResult.value("name").toString()},
        {"role", userResult.value("role").toString()},
        {"avatarUrl", userResult.value("avatar_url").toString()}
    };
}

bool AuthService::deleteSession(const QString& token) {
    QString tokenHash = QString::fromLatin1(QCryptographicHash::hash(token.toLatin1(), QCryptographicHash::Sha256).toHex());

    DatabaseManager& db = DatabaseManager::instance();
    return db.execute("DELETE FROM sessions WHERE token_hash = :tokenHash", {{"tokenHash", tokenHash}});
}

QJsonArray AuthService::getLoginHistory(int userId, int limit) {
    DatabaseManager& db = DatabaseManager::instance();

    auto results = db.executeQueryMultiple(
        "SELECT email, ip_address, success, failure_reason, created_at FROM login_history WHERE user_id = :userId ORDER BY created_at DESC LIMIT :limit",
        {{"userId", userId}, {"limit", limit}}
    );

    QJsonArray history;
    for (const auto& row : results) {
        history.append(QJsonObject{
            {"email", row.value("email")},
            {"ipAddress", row.value("ip_address")},
            {"success", row.value("success").toInt() == 1},
            {"failureReason", row.value("failure_reason")},
            {"createdAt", row.value("created_at")}
        });
    }

    return history;
}

QString AuthService::hashPassword(const QString& password) {
    return PasswordHash::hash(password);
}

bool AuthService::verifyPassword(const QString& password, const QString& hash) {
    return PasswordHash::verify(password, hash);
}

QString AuthService::generateToken() {
    return QUuid::createUuid().toString(QUuid::WithoutBraces) + 
           QUuid::createUuid().toString(QUuid::WithoutBraces);
}

} // namespace ClickFlash
