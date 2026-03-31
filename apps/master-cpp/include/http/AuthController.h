#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"
#include "services/AuthService.h"
#include <QJsonDocument>

namespace ClickFlash {

class AuthController {
public:
    static void registerRoutes(Router& router) {
        router.post("/api/auth/login", handleLogin);
        router.post("/api/auth/signup", handleSignup);
        router.post("/api/auth/logout", handleLogout);
        router.get("/api/auth/session", handleSession);
    }
    
    static void handleLogin(const HttpRequest& req, HttpResponse& res) {
        QString email = req.body.value("email").toString();
        QString password = req.body.value("password").toString();
        
        if (email.isEmpty() || password.isEmpty()) {
            res.setError(400, "Email and password are required");
            return;
        }
        
        if (!AuthService::validateCredentials(email, password)) {
            res.setError(401, "Invalid credentials");
            return;
        }
        
        auto user = AuthService::getUserByEmail(email);
        
        if (user.isEmpty()) {
            res.setError(401, "User not found");
            return;
        }
        
        int userId = user.value("id").toInt();
        QString role = user.value("role").toString();
        
        QString token = AuthService::generateToken(userId, role);
        
        AuthService::logLogin(userId, req.clientIp, true);
        
        QVariantMap response;
        response["token"] = token;
        response["user"] = QVariantMap({
            {"id", user.value("id")},
            {"email", user.value("email")},
            {"name", user.value("name")},
            {"role", user.value("role")}
        });
        
        res.setJson(response);
    }
    
    static void handleSignup(const HttpRequest& req, HttpResponse& res) {
        QString email = req.body.value("email").toString();
        QString password = req.body.value("password").toString();
        QString name = req.body.value("name").toString();
        QString role = req.body.value("role", "Photographer").toString();
        
        if (email.isEmpty() || password.isEmpty() || name.isEmpty()) {
            res.setError(400, "Email, password, and name are required");
            return;
        }
        
        if (password.length() < 6) {
            res.setError(400, "Password must be at least 6 characters");
            return;
        }
        
        if (AuthService::createUser(email, password, name, role)) {
            res.setStatus(201, "Created");
            res.setJson({{"success", true}, {"message", "User created successfully"}});
        } else {
            res.setError(500, "Failed to create user");
        }
    }
    
    static void handleLogout(const HttpRequest& req, HttpResponse& res) {
        res.setJson({{"success", true}, {"message", "Logged out successfully"}});
    }
    
    static void handleSession(const HttpRequest& req, HttpResponse& res) {
        QString authHeader = req.getHeader("Authorization");
        
        if (authHeader.isEmpty()) {
            res.setError(401, "No authorization header");
            return;
        }
        
        if (!authHeader.startsWith("Bearer ")) {
            res.setError(401, "Invalid authorization format");
            return;
        }
        
        QString token = authHeader.mid(7);
        
        res.setJson({{"valid", true}, {"token", token}});
    }
};

} // namespace ClickFlash
