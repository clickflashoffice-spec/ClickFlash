#pragma once

#include <string>
#include <map>
#include <optional>
#include <fstream>
#include <filesystem>

namespace ClickFlash {

class Config {
public:
    Config();
    ~Config() = default;

    void load();
    void save();

    int getPort() const { return port_; }
    std::string getDatabasePath() const { return databasePath_; }
    std::string getLogLevel() const { return logLevel_; }
    std::string getUploadPath() const { return uploadPath_; }
    std::string getProcessingPath() const { return processingPath_; }
    bool isProduction() const { return production_; }
    std::string getJwtSecret() const { return jwtSecret_; }
    int getJwtExpiryHours() const { return jwtExpiryHours_; }
    std::string getCorsOrigin() const { return corsOrigin_; }
    int getMaxUploadSize() const { return maxUploadSize_; }
    int getThumbnailSize() const { return thumbnailSize_; }
    int getPreviewSize() const { return previewSize_; }
    int getWorkerCount() const { return workerCount_; }

    void setPort(int port) { port_ = port; }
    void setLogLevel(const std::string& level) { logLevel_ = level; }
    void setProduction(bool prod) { production_ = prod; }

    static std::string getEnv(const std::string& key, const std::string& defaultValue = "");

private:
    void loadFromFile(const std::string& path);
    void loadFromEnv();
    void setDefaults();

    int port_;
    std::string databasePath_;
    std::string logLevel_;
    std::string uploadPath_;
    std::string processingPath_;
    bool production_;
    std::string jwtSecret_;
    int jwtExpiryHours_;
    std::string corsOrigin_;
    int maxUploadSize_;
    int thumbnailSize_;
    int previewSize_;
    int workerCount_;
    std::map<std::string, std::string> values_;
};

}