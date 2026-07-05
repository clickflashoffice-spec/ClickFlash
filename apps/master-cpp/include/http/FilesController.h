/// @file FilesController.h
/// @brief Drogon HTTP controller for photo/file management endpoints
#pragma once

#include <drogon/HttpController.h>
#include <nlohmann/json.hpp>

namespace cf::http {

/// File management controller – list, get, upload, delete
/// displayName: FilesController
class FilesController : public drogon::HttpController<FilesController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(FilesController::listFiles,  "/api/files",          drogon::Get);
    ADD_METHOD_TO(FilesController::getFile,    "/api/files/{id}",     drogon::Get);
    ADD_METHOD_TO(FilesController::uploadFile, "/api/files/upload",   drogon::Post);
    ADD_METHOD_TO(FilesController::deleteFile, "/api/files/{id}",     drogon::Delete);
    METHOD_LIST_END

    /// GET /api/files?album_id=&page=&limit=&status= — paginated file list
    drogon::Task<> listFiles(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

    /// GET /api/files/{id} — single file metadata
    drogon::Task<> getFile(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback,
        std::string id);

    /// POST /api/files/upload — upload a new photo (multipart or raw body)
    drogon::Task<> uploadFile(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback);

    /// DELETE /api/files/{id} — remove file from disk and DB
    drogon::Task<> deleteFile(
        drogon::HttpRequestPtr req,
        std::function<void(const drogon::HttpResponsePtr&)> callback,
        std::string id);

private:
    static drogon::HttpResponsePtr jsonResp(const nlohmann::json& j,
                                            drogon::HttpStatusCode code = drogon::k200OK);

    static drogon::HttpResponsePtr errorResp(const std::string& message,
                                             drogon::HttpStatusCode code);
};

} // namespace cf::http