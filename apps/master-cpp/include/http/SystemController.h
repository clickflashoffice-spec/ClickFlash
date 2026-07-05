/// @file SystemController.h
/// @brief Drogon HTTP controller for system health, info, and stats endpoints
#pragma once

#include <drogon/HttpController.h>
#include <nlohmann/json.hpp>

namespace cf::http {

/// System health and diagnostics controller
/// displayName: SystemController
class SystemController : public drogon::HttpController<SystemController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(SystemController::getHealth, "/api/health", drogon::Get);
    ADD_METHOD_TO(SystemController::getInfo, "/api/system/info", drogon::Get);
    ADD_METHOD_TO(SystemController::getStats, "/api/system/stats", drogon::Get);
    METHOD_LIST_END

    /// GET /api/health — lightweight liveness probe
    drogon::Task<> getHealth(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

    /// GET /api/system/info — service metadata + DB counts
    drogon::Task<> getInfo(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

    /// GET /api/system/stats — today/week orders, revenue, pending
    drogon::Task<> getStats(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

private:
    /// Build a standard JSON response with correct Content-Type
    static drogon::HttpResponsePtr jsonResp(const nlohmann::json& j,
                                            drogon::HttpStatusCode code = drogon::k200OK);
};

} // namespace cf::http
