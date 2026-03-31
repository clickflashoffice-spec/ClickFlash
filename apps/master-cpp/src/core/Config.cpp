#include "core/Config.h"
#include <iostream>
#include <cstdlib>

namespace ClickFlash {

Config::Config() 
    : port_(8090)
    , databasePath_("./data/master.db")
    , logLevel_("info")
    , uploadPath_("./uploads")
    , processingPath_("./pb_data/processing")
    , production_(false)
    , jwtSecret_("clickflash-default-secret-change-in-production")
    , jwtExpiryHours_(24)
    , corsOrigin_("*")
    , maxUploadSize_(104857600)
    , thumbnailSize_(300)
    , previewSize_(1200)
    , workerCount_(4) {}

void Config::load() {
    setDefaults();
    loadFromEnv();

    const char* envPort = std::getenv("PORT");
    if (envPort) port_ = std::stoi(envPort);

    const char* envDbPath = std::getenv("DATABASE_PATH");
    if (envDbPath) databasePath_ = envDbPath;

    const char* envLogLevel = std::getenv("LOG_LEVEL");
    if (envLogLevel) logLevel_ = envLogLevel;

    const char* envProduction = std::getenv("NODE_ENV");
    if (envProduction && std::string(envProduction) == "production") {
        production_ = true;
    }

    const char* envJwtSecret = std::getenv("JWT_SECRET");
    if (envJwtSecret) jwtSecret_ = envJwtSecret;
}

void Config::loadFromEnv() {
    for (const auto& [key, value] : values_) {
        const char* envValue = std::getenv(key.c_str());
        if (envValue) {
            values_[key] = envValue;
        }
    }
}

void Config::setDefaults() {
    values_ = {
        {"PORT", "8090"},
        {"DATABASE_PATH", "./data/master.db"},
        {"LOG_LEVEL", "info"},
        {"UPLOAD_PATH", "./uploads"},
        {"PROCESSING_PATH", "./pb_data/processing"},
        {"NODE_ENV", "development"},
        {"JWT_SECRET", "clickflash-default-secret-change-in-production"},
        {"JWT_EXPIRY_HOURS", "24"},
        {"CORS_ORIGIN", "*"},
        {"MAX_UPLOAD_SIZE", "104857600"},
        {"THUMBNAIL_SIZE", "300"},
        {"PREVIEW_SIZE", "1200"},
        {"WORKER_COUNT", "4"}
    };
}

void Config::save() {
    std::ofstream configFile("config.json");
    if (!configFile.is_open()) {
        std::cerr << "Failed to save config file" << std::endl;
        return;
    }

    configFile << "{\n";
    configFile << "  \"port\": " << port_ << ",\n";
    configFile << "  \"databasePath\": \"" << databasePath_ << "\",\n";
    configFile << "  \"logLevel\": \"" << logLevel_ << "\",\n";
    configFile << "  \"production\": " << (production_ ? "true" : "false") << "\n";
    configFile << "}\n";

    configFile.close();
}

std::string Config::getEnv(const std::string& key, const std::string& defaultValue) {
    const char* value = std::getenv(key.c_str());
    return value ? std::string(value) : defaultValue;
}

}