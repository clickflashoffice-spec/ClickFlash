/// @file AuthController.h
/// @brief Drogon HTTP controller for authentication endpoints
#pragma once

#include <drogon/HttpController.h>
#include <nlohmann/json.hpp>

namespace cf::http {

/// Authentication controller – login, logout, session
/// displayName: AuthController
class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuthController::login,   "/api/auth/login",   drogon::Post);
    ADD_METHOD_TO(AuthController::logout,  "/api/auth/logout",  drogon::Post);
    ADD_METHOD_TO(AuthController::session, "/api/auth/session", drogon::Get);
    METHOD_LIST_END

    /// POST /api/auth/login — validate credentials, return JWT + user
    drogon::Task<> login(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

    /// POST /api/auth/logout — invalidate current session
    drogon::Task<> logout(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

    /// GET /api/auth/session — validate Bearer token
    drogon::Task<> session(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

private:
    static drogon::HttpResponsePtr jsonResp(const nlohmann::json& j,
                                            drogon::HttpStatusCode code = drogon::k200OK);

    static drogon::HttpResponsePtr errorResp(const std::string& message,
                                             drogon::HttpStatusCode code);
};

} // namespace cf::http
