/// @file FilesController.cpp
/// @brief Drogon implementation for file/photo management endpoints
#include "http/FilesController.h"
#include "db/DatabaseManager.h"
#include "services/RedisCacheService.h"
#include <spdlog/spdlog.h>
#include <filesystem>
#include <fstream>
#include <random>

using namespace drogon;
using json = nlohmann::json;
namespace fs = std::filesystem;

namespace cf::http {

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

HttpResponsePtr FilesController::jsonResp(const json& j, HttpStatusCode code) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(code);
    resp->setContentTypeCode(CT_APPLICATION_JSON);
    resp->setBody(j.dump());
    return resp;
}

HttpResponsePtr FilesController::errorResp(const std::string& message,
                                           HttpStatusCode code) {
    return jsonResp({{"error", message}, {"code", static_cast<int>(code)}}, code);
}

/// Generate a UUID-style id (simple, no external dep)
static std::string generateId() {
    static thread_local std::mt19937_64 rng{std::random_device{}()};
    std::uniform_int_distribution<uint64_t> dist;
    auto a = dist(rng), b = dist(rng);
    char buf[37];
    std::snprintf(buf, sizeof(buf),
        "%08x-%04x-%04x-%04x-%012llx",
        static_cast<uint32_t>(a >> 32),
        static_cast<uint16_t>(a >> 16),
        static_cast<uint16_t>((a & 0xFFFF) | 0x4000),
        static_cast<uint16_t>((b >> 48) | 0x8000),
        static_cast<unsigned long long>(b & 0xFFFFFFFFFFFF));
    return buf;
}

// ---------------------------------------------------------------------------
// GET /api/files?album_id=&page=&limit=&status=
// ---------------------------------------------------------------------------

Task<> FilesController::listFiles(
    HttpRequestPtr req,
    std::function<void(const HttpResponsePtr&)> callback)
{
    const auto albumId = req->getParameter("album_id");
    const int  page    = std::max(1, std::atoi(req->getParameter("page").c_str()));
    const int  limit   = std::clamp(std::atoi(req->getParameter("limit").c_str()), 1, 200);
    const auto status  = req->getParameter("status");

    if (albumId.empty()) {
        callback(errorResp("album_id is required", k400BadRequest));
        co_return;
    }

    try {
        auto& conn = cf::db::DatabaseManager::instance().conn();

        std::string sql =
            "SELECT id, url, thumbnail_url, width, height, file_size, culling_status "
            "FROM photos WHERE album_id = ?";
        if (!status.empty()) sql += " AND culling_status = ?";
        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

        SQLite::Statement q(conn, sql);
        int idx = 1;
        q.bind(idx++, albumId);
        if (!status.empty()) q.bind(idx++, status);
        q.bind(idx++, limit);
        q.bind(idx++, (page - 1) * limit);

        json photos = json::array();
        while (q.executeStep()) {
            photos.push_back({
                {"id",             q.getColumn("id").getString()},
                {"url",            q.getColumn("url").getString()},
                {"thumbnail_url",  q.getColumn("thumbnail_url").getString()},
                {"width",          q.getColumn("width").getInt()},
                {"height",         q.getColumn("height").getInt()},
                {"file_size",      q.getColumn("file_size").getInt64()},
                {"culling_status", q.getColumn("culling_status").getString()}
            });
        }

        callback(jsonResp({{"photos", photos}, {"page", page}, {"limit", limit}}));
    } catch (const std::exception& e) {
        spdlog::error("listFiles failed: {}", e.what());
        callback(errorResp("Internal server error", k500InternalServerError));
    }

    co_return;
}

// ---------------------------------------------------------------------------
// GET /api/files/{id}
// ---------------------------------------------------------------------------

Task<> FilesController::getFile(
    HttpRequestPtr /*req*/,
    std::function<void(const HttpResponsePtr&)> callback,
    std::string id)
{
    try {
        auto& conn = cf::db::DatabaseManager::instance().conn();

        SQLite::Statement q(conn,
            "SELECT id, album_id, url, thumbnail_url, preview_url, "
            "width, height, file_size, file_hash, culling_status, "
            "sync_status, created_at "
            "FROM photos WHERE id = ?");
        q.bind(1, id);

        if (!q.executeStep()) {
            callback(errorResp("File not found", k404NotFound));
            co_return;
        }

        json result;
        result["id"]             = q.getColumn("id").getString();
        result["album_id"]       = q.getColumn("album_id").getString();
        result["url"]            = q.getColumn("url").getString();
        result["thumbnail_url"]  = q.getColumn("thumbnail_url").getString();
        result["preview_url"]    = q.getColumn("preview_url").getString();
        result["width"]          = q.getColumn("width").getInt();
        result["height"]         = q.getColumn("height").getInt();
        result["file_size"]      = q.getColumn("file_size").getInt64();
        result["file_hash"]      = q.getColumn("file_hash").getString();
        result["culling_status"] = q.getColumn("culling_status").getString();
        result["sync_status"]    = q.getColumn("sync_status").getString();
        result["created_at"]     = q.getColumn("created_at").getString();

        callback(jsonResp(result));
    } catch (const std::exception& e) {
        spdlog::error("getFile({}) failed: {}", id, e.what());
        callback(errorResp("Internal server error", k500InternalServerError));
    }

    co_return;
}

// ---------------------------------------------------------------------------
// POST /api/files/upload
// ---------------------------------------------------------------------------

Task<> FilesController::uploadFile(
    HttpRequestPtr req,
    std::function<void(const HttpResponsePtr&)> callback)
{
    // Expect multipart upload; fall back to raw body
    MultiPartParser fileParser;
    std::string fileData;
    std::string albumId;

    if (fileParser.parse(req) == 0) {
        // Multipart: extract album_id param + first file
        auto params = fileParser.getParameters();
        if (auto it = params.find("album_id"); it != params.end())
            albumId = it->second;

        auto& files = fileParser.getFiles();
        if (files.empty()) {
            callback(errorResp("No file provided in multipart body", k400BadRequest));
            co_return;
        }
        fileData.assign(files[0].fileContent().data(), files[0].fileContent().size());
    } else {
        // Raw body upload – album_id from query param
        albumId  = req->getParameter("album_id");
        fileData = std::string(req->getBody());
    }

    if (fileData.empty()) {
        callback(errorResp("No file data provided", k400BadRequest));
        co_return;
    }
    if (albumId.empty()) {
        callback(errorResp("album_id is required", k400BadRequest));
        co_return;
    }

    try {
        const std::string fileId = generateId();
        // TODO: read dataDir from Config once ported to cf::core
        const std::string dataDir  = "./data";
        const fs::path    albumDir = fs::path(dataDir) / "albums" / albumId;
        fs::create_directories(albumDir);

        const fs::path filePath = albumDir / fileId;

        // Write to disk
        {
            std::ofstream out(filePath, std::ios::binary);
            if (!out) {
                callback(errorResp("Failed to save file", k500InternalServerError));
                co_return;
            }
            out.write(fileData.data(), static_cast<std::streamsize>(fileData.size()));
        }

        const std::string url = "local://albums/" + albumId + "/" + fileId;

        // Use Redis Streams instead of direct SQLite INSERT per V6.0 invariant
        json payload = {
            {"fileId", fileId},
            {"albumId", albumId},
            {"url", url},
            {"storagePath", filePath.string()},
            {"fileSize", fileData.size()}
        };
        cf::services::RedisCacheService::instance().publishEvent("photo_ingestion", "photo_uploaded", payload);

        spdlog::info("File uploaded: {} ({} bytes)", fileId, fileData.size());

        json result;
        result["id"]   = fileId;
        result["url"]  = url;
        result["size"] = fileData.size();

        callback(jsonResp(result, k201Created));
    } catch (const std::exception& e) {
        spdlog::error("uploadFile failed: {}", e.what());
        callback(errorResp("Failed to save file metadata", k500InternalServerError));
    }

    co_return;
}

// ---------------------------------------------------------------------------
// DELETE /api/files/{id}
// ---------------------------------------------------------------------------

Task<> FilesController::deleteFile(
    HttpRequestPtr /*req*/,
    std::function<void(const HttpResponsePtr&)> callback,
    std::string id)
{
    try {
        auto& conn = cf::db::DatabaseManager::instance().conn();

        // Fetch storage path
        SQLite::Statement sel(conn,
            "SELECT storage_path FROM photos WHERE id = ?");
        sel.bind(1, id);

        if (!sel.executeStep()) {
            callback(errorResp("File not found", k404NotFound));
            co_return;
        }

        const std::string storagePath = sel.getColumn(0).getString();

        // Remove from disk (best-effort)
        std::error_code ec;
        fs::remove(storagePath, ec);
        if (ec) {
            spdlog::warn("Could not delete file on disk {}: {}", storagePath, ec.message());
        }

        // Remove from DB
        SQLite::Statement del(conn, "DELETE FROM photos WHERE id = ?");
        del.bind(1, id);
        del.exec();

        spdlog::info("File deleted: {}", id);

        auto resp = HttpResponse::newHttpResponse();
        resp->setStatusCode(k204NoContent);
        callback(resp);
    } catch (const std::exception& e) {
        spdlog::error("deleteFile({}) failed: {}", id, e.what());
        callback(errorResp("Failed to delete file", k500InternalServerError));
    }

    co_return;
}

} // namespace cf::http