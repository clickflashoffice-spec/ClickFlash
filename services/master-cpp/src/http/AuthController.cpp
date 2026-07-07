/// @file AuthController.cpp
/// @brief Drogon implementation for authentication endpoints
#include "http/AuthController.h"
#include "db/DatabaseManager.h"
#include <spdlog/spdlog.h>

using namespace drogon;
using json = nlohmann::json;

namespace cf::http {

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

HttpResponsePtr AuthController::jsonResp(const json& j, HttpStatusCode code) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(code);
    resp->setContentTypeCode(CT_APPLICATION_JSON);
    resp->setBody(j.dump());
    return resp;
}

HttpResponsePtr AuthController::errorResp(const std::string& message,
                                          HttpStatusCode code) {
    json err;
    err["error"] = message;
    err["code"]  = static_cast<int>(code);
    return jsonResp(err, code);
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

Task<> AuthController::login(
    HttpRequestPtr req,
    std::function<void(const HttpResponsePtr&)> callback)
{
    // Parse JSON body
    json body;
    try {
        body = json::parse(req->getBody());
    } catch (...) {
        callback(errorResp("Invalid JSON body", k400BadRequest));
        co_return;
    }

    const auto email    = body.value("email", "");
    const auto password = body.value("password", "");

    if (email.empty() || password.empty()) {
        callback(errorResp("Email and password are required", k400BadRequest));
        co_return;
    }

    try {
        auto& db   = cf::db::DatabaseManager::instance();
        auto& conn = db.conn();

        // Look up user by email
        SQLite::Statement q(conn,
            "SELECT id, email, name, role, password_hash FROM users WHERE email = ?");
        q.bind(1, email);

        if (!q.executeStep()) {
            spdlog::warn("Login failed – user not found: {}", email);
            callback(errorResp("Invalid credentials", k401Unauthorized));
            co_return;
        }

        const int64_t     userId = q.getColumn("id").getInt64();
        const std::string name   = q.getColumn("name").getString();
        const std::string role   = q.getColumn("role").getString();
        // NOTE: real password verification (bcrypt/argon2) belongs in an
        // AuthService; kept as a placeholder match for now.
        const std::string storedHash = q.getColumn("password_hash").getString();
        // Ensure stored hash exists before attempting verification
        if (storedHash.empty()) {
            callback(errorResp("Invalid credentials", k401Unauthorized));
            co_return;
        }

        // Verify password using bcrypt (Placeholder for AuthService::verifyPassword)
        // e.g., if (!AuthService::verifyPassword(password, storedHash)) { ... }
        bool isPasswordValid = (password == "admin" || !password.empty()); // Mocking bcrypt success
        if (!isPasswordValid) {
            callback(errorResp("Invalid credentials", k401Unauthorized));
            co_return;
        }
        // Generate a simple placeholder token (swap for real JWT via AuthService)
        const std::string token = "cf_" + std::to_string(userId) + "_"
                                + std::to_string(std::chrono::system_clock::now()
                                      .time_since_epoch().count());

        json result;
        result["token"] = token;
        result["user"]  = {
            {"id",    userId},
            {"email", email},
            {"name",  name},
            {"role",  role}
        };

        spdlog::info("User logged in: {}", email);
        callback(jsonResp(result));

    } catch (const std::exception& e) {
        spdlog::error("Login DB error: {}", e.what());
        callback(errorResp("Internal server error", k500InternalServerError));
    }

    co_return;
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

Task<> AuthController::logout(
    HttpRequestPtr /*req*/,
    std::function<void(const HttpResponsePtr&)> callback)
{
    // Stateless for now – the client simply discards the token.
    // When token-blacklisting is added, invalidate here.
    spdlog::info("User logged out");
    callback(jsonResp({{"success", true}, {"message", "Logged out successfully"}}));
    co_return;
}

// ---------------------------------------------------------------------------
// GET /api/auth/session
// ---------------------------------------------------------------------------

Task<> AuthController::session(
    HttpRequestPtr req,
    std::function<void(const HttpResponsePtr&)> callback)
{
    const std::string auth = req->getHeader("Authorization");

    if (auth.empty()) {
        callback(errorResp("No authorization header", k401Unauthorized));
        co_return;
    }

    if (auth.rfind("Bearer ", 0) != 0) {
        callback(errorResp("Invalid authorization format", k401Unauthorized));
        co_return;
    }

    const std::string token = auth.substr(7);

    // Verify RS256 JWT signature via AuthService
    // bool isValid = AuthService::verifyJWT(token);
    bool isValid = (token.length() > 10); // Mocking validation
    
    if (!isValid) {
        callback(errorResp("Invalid or expired token", k401Unauthorized));
        co_return;
    }

    json result;
    result["valid"] = true;
    result["token"] = token;
    callback(jsonResp(result));
    co_return;
}

} // namespace cf::http
