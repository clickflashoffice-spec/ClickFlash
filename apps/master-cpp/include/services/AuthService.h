#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include <QCryptographicHash>
#include <QDateTime>
#include <QString>

namespace ClickFlash {

class AuthService {
public:
    static bool validateCredentials(const QString& email, const QString& password) {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto result = db.executeQuery(
            "SELECT password_hash FROM users WHERE email = :email AND active = 1",
            {{"email", email}}
        );
        
        if (result.isEmpty()) {
            return false;
        }
        
        QString storedHash = result.value("password_hash").toString();
        QString inputHash = hashPassword(password);
        
        return storedHash == inputHash;
    }
    
    static QString hashPassword(const QString& password) {
        QByteArray data = password.toUtf8();
        QByteArray hash = QCryptographicHash::hash(data, QCryptographicHash::Sha256);
        return QString(hash.toHex());
    }
    
    static QString generateToken(int userId, const QString& role) {
        QString data = QString("%1:%2:%3")
            .arg(userId)
            .arg(role)
            .arg(QDateTime::currentSecsSinceEpoch());
        
        QByteArray hash = QCryptographicHash::hash(
            data.toUtf8(), 
            QCryptographicHash::Sha256
        );
        
        return QString(hash.toHex());
    }
    
    static QVariantMap getUserByEmail(const QString& email) {
        DatabaseManager& db = DatabaseManager::instance();
        
        return db.executeQuery(
            "SELECT id, email, name, role, avatar_url FROM users WHERE email = :email",
            {{"email", email}}
        );
    }
    
    static bool createUser(const QString& email, const QString& password, 
                           const QString& name, const QString& role = "Photographer") {
        DatabaseManager& db = DatabaseManager::instance();
        
        QString passwordHash = hashPassword(password);
        
        return db.execute(
            "INSERT INTO users (email, password_hash, name, role) VALUES (:email, :hash, :name, :role)",
            {{"email", email}, {"hash", passwordHash}, {"name", name}, {"role", role}}
        );
    }
    
    static void logLogin(int userId, const QString& ip, bool success) {
        DatabaseManager& db = DatabaseManager::instance();
        
        db.execute(
            "INSERT INTO login_history (user_id, ip_address, success) VALUES (:userId, :ip, :success)",
            {{"userId", userId}, {"ip", ip}, {"success", success ? 1 : 0}}
        );
    }
};

} // namespace ClickFlash
