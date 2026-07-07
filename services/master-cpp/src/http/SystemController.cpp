/// @file SystemController.cpp
/// @brief Drogon implementation for system health, info, and stats
#include "http/SystemController.h"
#include "db/DatabaseManager.h"
#include <spdlog/spdlog.h>
#include <chrono>

using namespace drogon;
using json = nlohmann::json;

namespace cf::http {

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

HttpResponsePtr SystemController::jsonResp(const json& j, HttpStatusCode code) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(code);
    resp->setContentTypeCode(CT_APPLICATION_JSON);
    resp->setBody(j.dump());
    return resp;
}

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------

Task<> SystemController::getHealth(
    HttpRequestPtr /*req*/,
    std::function<void(const HttpResponsePtr&)> callback)
{
    json health;
    health["status"]  = "ok";
    health["service"] = "master";
    health["version"] = "6.0.0";

    try {
        auto& db = cf::db::DatabaseManager::instance();
        if (db.isInitialized()) {
            db.conn().exec("SELECT 1");
            health["database"] = "connected";
        } else {
            health["database"] = "disconnected";
            health["status"]   = "degraded";
        }
    } catch (const std::exception& e) {
        spdlog::warn("Health check DB probe failed: {}", e.what());
        health["database"] = "disconnected";
        health["status"]   = "degraded";
    }

    auto now = std::chrono::system_clock::now();
    health["timestamp"] = std::chrono::duration_cast<std::chrono::seconds>(
                              now.time_since_epoch())
                              .count();

    callback(jsonResp(health));
    co_return;
}

// ---------------------------------------------------------------------------
// GET /api/system/info
// ---------------------------------------------------------------------------

Task<> SystemController::getInfo(
    HttpRequestPtr /*req*/,
    std::function<void(const HttpResponsePtr&)> callback)
{
    json info;
    info["name"]     = "ClickFlash Master";
    info["version"]  = "6.0.0";
    info["platform"] = "Windows";
    info["engine"]   = "Drogon";

    try {
        auto& db = cf::db::DatabaseManager::instance();
        auto& conn = db.conn();

        auto countOf = [&](const char* table) -> int64_t {
            SQLite::Statement q(conn, std::string("SELECT COUNT(*) FROM ") + table);
            if (q.executeStep()) return q.getColumn(0).getInt64();
            return 0;
        };

        info["database"] = {
            {"users",  countOf("users")},
            {"albums", countOf("albums")},
            {"photos", countOf("photos")},
            {"orders", countOf("orders")}
        };
    } catch (const std::exception& e) {
        spdlog::warn("system/info DB query failed: {}", e.what());
        info["database"] = "error";
    }

    callback(jsonResp(info));
    co_return;
}

// ---------------------------------------------------------------------------
// GET /api/system/stats
// ---------------------------------------------------------------------------

Task<> SystemController::getStats(
    HttpRequestPtr /*req*/,
    std::function<void(const HttpResponsePtr&)> callback)
{
    json stats;

    try {
        auto& db = cf::db::DatabaseManager::instance();
        auto& conn = db.conn();

        // Today
        {
            SQLite::Statement q(conn,
                "SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS rev "
                "FROM orders WHERE DATE(created_at) = DATE('now')");
            if (q.executeStep()) {
                stats["today"] = {
                    {"orders",  q.getColumn("cnt").getInt64()},
                    {"revenue", q.getColumn("rev").getDouble()}
                };
            }
        }

        // Week
        {
            SQLite::Statement q(conn,
                "SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS rev "
                "FROM orders WHERE created_at >= DATE('now', '-7 days')");
            if (q.executeStep()) {
                stats["week"] = {
                    {"orders",  q.getColumn("cnt").getInt64()},
                    {"revenue", q.getColumn("rev").getDouble()}
                };
            }
        }

        // Pending
        {
            SQLite::Statement q(conn,
                "SELECT COUNT(*) AS cnt FROM orders WHERE status = 'pending'");
            if (q.executeStep()) {
                stats["pending"] = q.getColumn("cnt").getInt64();
            }
        }
    } catch (const std::exception& e) {
        spdlog::error("system/stats DB query failed: {}", e.what());
        callback(jsonResp({{"error", e.what()}}, k500InternalServerError));
        co_return;
    }

    callback(jsonResp(stats));
    co_return;
}

} // namespace cf::http
