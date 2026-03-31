#include "services/AuthService.h"
#include "database/DatabaseManager.h"
#include <sstream>
#include <random>
#include <ctime>

namespace ClickFlash {

AuthService::AuthService(DatabaseManager* db) : db_(db) {}

AuthService::LoginResult AuthService::login(const std::string& username, const std::string& password) {
    LoginResult result;
    result.success = false;

    auto userData = db_->queryMultiple("SELECT id, username, password_hash, email, role, is_active FROM users WHERE username = '" + username + "'");
    
    if (userData.empty()) {
        result.error = "User not found";
        return result;
    }

    const auto& row = userData[0];
    if (!verifyPassword(password, row[2])) {
        result.error = "Invalid password";
        return result;
    }

    if (row[5] != "1") {
        result.error = "Account is inactive";
        return result;
    }

    result.success = true;
    result.token = generateToken(std::stoll(row[0]));
    result.user.id = std::stoll(row[0]);
    result.user.username = row[1];
    result.user.email = row[3];
    result.user.role = row[4];
    result.user.isActive = true;

    tokenToUserId_[result.token] = result.user.id;

    return result;
}

bool AuthService::logout(const std::string& token) {
    auto it = tokenToUserId_.find(token);
    if (it != tokenToUserId_.end()) {
        tokenToUserId_.erase(it);
        return true;
    }
    return false;
}

bool AuthService::validateToken(const std::string& token) {
    return tokenToUserId_.find(token) != tokenToUserId_.end();
}

std::optional<AuthService::User> AuthService::getUserById(int64_t userId) {
    auto userData = db_->queryMultiple("SELECT id, username, email, role, is_active FROM users WHERE id = " + std::to_string(userId));
    if (userData.empty()) return std::nullopt;

    User user;
    user.id = std::stoll(userData[0][0]);
    user.username = userData[0][1];
    user.email = userData[0][2];
    user.role = userData[0][3];
    user.isActive = userData[0][4] == "1";
    return user;
}

std::optional<AuthService::User> AuthService::getUserByUsername(const std::string& username) {
    auto userData = db_->queryMultiple("SELECT id, username, email, role, is_active FROM users WHERE username = '" + username + "'");
    if (userData.empty()) return std::nullopt;

    User user;
    user.id = std::stoll(userData[0][0]);
    user.username = userData[0][1];
    user.email = userData[0][2];
    user.role = userData[0][3];
    user.isActive = userData[0][4] == "1";
    return user;
}

bool AuthService::createUser(const std::string& username, const std::string& password,
                              const std::string& email, const std::string& role) {
    std::string hash = hashPassword(password);
    std::ostringstream sql;
    sql << "INSERT INTO users (username, password_hash, email, role, is_active, created_at) "
        << "VALUES ('" << username << "', '" << hash << "', '" << email << "', '" 
        << role << "', 1, datetime('now'))";
    return db_->execute(sql.str());
}

bool AuthService::updateUser(int64_t userId, const std::string& email, const std::string& role) {
    std::ostringstream sql;
    sql << "UPDATE users SET email = '" << email << "', role = '" << role << "', updated_at = datetime('now') WHERE id = " << userId;
    return db_->execute(sql.str());
}

bool AuthService::deleteUser(int64_t userId) {
    return db_->execute("DELETE FROM users WHERE id = " + std::to_string(userId));
}

std::vector<AuthService::User> AuthService::getAllUsers() {
    auto userData = db_->queryMultiple("SELECT id, username, email, role, is_active FROM users");
    std::vector<User> users;
    
    for (const auto& row : userData) {
        User user;
        user.id = std::stoll(row[0]);
        user.username = row[1];
        user.email = row[2];
        user.role = row[3];
        user.isActive = row[4] == "1";
        users.push_back(user);
    }
    return users;
}

std::string AuthService::generateToken(int64_t userId) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);
    
    std::string token;
    const char hex[] = "0123456789abcdef";
    for (int i = 0; i < 32; ++i) {
        token += hex[dis(gen)];
    }
    return token;
}

std::string AuthService::hashPassword(const std::string& password) {
    return password + "_hashed";
}

bool AuthService::verifyPassword(const std::string& password, const std::string& hash) {
    return (password + "_hashed") == hash;
}

}