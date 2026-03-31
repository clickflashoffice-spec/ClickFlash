#pragma once

#include <string>
#include <memory>
#include <unordered_map>
#include <functional>
#include <vector>
#include <optional>

#include "database/DatabaseManager.h"

namespace ClickFlash {

class AuthService {
public:
    explicit AuthService(DatabaseManager* db);
    ~AuthService() = default;

    struct User {
        int64_t id;
        std::string username;
        std::string email;
        std::string role;
        bool isActive;
    };

    struct LoginResult {
        bool success;
        std::string token;
        User user;
        std::string error;
    };

    LoginResult login(const std::string& username, const std::string& password);
    bool logout(const std::string& token);
    bool validateToken(const std::string& token);
    std::optional<User> getUserById(int64_t userId);
    std::optional<User> getUserByUsername(const std::string& username);
    bool createUser(const std::string& username, const std::string& password, 
                    const std::string& email, const std::string& role);
    bool updateUser(int64_t userId, const std::string& email, const std::string& role);
    bool deleteUser(int64_t userId);
    std::vector<User> getAllUsers();

    std::string generateToken(int64_t userId);
    std::string hashPassword(const std::string& password);
    bool verifyPassword(const std::string& password, const std::string& hash);

private:
    DatabaseManager* db_;
    std::unordered_map<std::string, int64_t> tokenToUserId_;
};

}