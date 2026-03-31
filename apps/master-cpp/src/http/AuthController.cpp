#include "http/AuthController.h"
#include "services/AuthService.h"
#include "core/Logger.h"
#include <QJsonDocument>

namespace ClickFlash {

AuthController::AuthController(QObject* parent)
    : QObject(parent)
{
}

void AuthController::handleLogin(const HttpRequest& request, HttpResponse& response) {
    QString email = request.body.value("email").toString();
    QString password = request.body.value("password").toString();

    if (email.isEmpty() || password.isEmpty()) {
        response.setError(400, "Email and password are required");
        return;
    }

    if (!AuthService::validateCredentials(email, password)) {
        CF_WARN("Login failed for email: {}", email.toStdString());
        response.setError(401, "Invalid credentials");
        return;
    }

    auto user = AuthService::getUserByEmail(email);
    if (user.isEmpty()) {
        response.setError(401, "User not found");
        return;
    }

    int userId = user.value("id").toInt();
    QString role = user.value("role").toString();
    QString token = AuthService::generateToken(userId, role);

    response.setStatus(200);
    response.body = QJsonObject{
        {"token", token},
        {"user", QJsonObject{
            {"id", userId},
            {"email", email},
            {"name", user.value("name")},
            {"role", role},
            {"avatarUrl", user.value("avatar_url")}
        }}
    };

    CF_INFO("User logged in: {}", email.toStdString());
}

void AuthController::handleLogout(const HttpRequest& request, HttpResponse& response) {
    Q_UNUSED(request);
    response.setStatus(200);
    response.body = QJsonObject{{"success", true}};
    CF_INFO("User logged out");
}

void AuthController::handleRegister(const HttpRequest& request, HttpResponse& response) {
    QString email = request.body.value("email").toString();
    QString password = request.body.value("password").toString();
    QString name = request.body.value("name").toString();
    QString role = request.body.value("role").toString("Photographer");

    if (email.isEmpty() || password.isEmpty() || name.isEmpty()) {
        response.setError(400, "Email, password, and name are required");
        return;
    }

    if (AuthService::createUser(email, password, name, role)) {
        response.setStatus(201);
        response.body = QJsonObject{
            {"success", true},
            {"message", "User created successfully"}
        };
        CF_INFO("User registered: {}", email.toStdString());
    } else {
        response.setError(500, "Failed to create user");
    }
}

void AuthController::handleSession(const HttpRequest& request, HttpResponse& response) {
    Q_UNUSED(request);
    response.setStatus(200);
    response.body = QJsonObject{{"valid", true}};
}

void AuthController::handleMe(const HttpRequest& request, HttpResponse& response) {
    QString authHeader = request.headers.value("authorization").toString();
    
    if (!authHeader.startsWith("Bearer ")) {
        response.setError(401, "No token provided");
        return;
    }

    QString token = authHeader.mid(7);
    
    auto payload = AuthService::validateSession(token);
    if (payload.isEmpty()) {
        response.setError(401, "Invalid token");
        return;
    }

    QString email = payload.value("email").toString();
    auto user = AuthService::getUserByEmail(email);

    if (user.isEmpty()) {
        response.setError(404, "User not found");
        return;
    }

    response.setStatus(200);
    response.body = QJsonObject{
        {"id", user.value("id")},
        {"email", user.value("email")},
        {"name", user.value("name")},
        {"role", user.value("role")},
        {"avatarUrl", user.value("avatar_url")}
    };
}

} // namespace ClickFlash
