#include <drogon/drogon.h>
#include <spdlog/spdlog.h>
#include "core/Config.h"
#include "db/DatabaseManager.h"
#include "services/RedisCacheService.h"
#include <csignal>

using namespace drogon;

std::function<void()> shutdownHandler;

void signalHandler(int sig) {
    spdlog::info("Received signal {}, shutting down...", sig);
    if (shutdownHandler) {
        shutdownHandler();
    }
}

int main(int argc, char* argv[]) {
    // Setup logging
    spdlog::set_level(spdlog::level::debug);
    spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] %v");
    
    spdlog::info("ClickFlash Master Service v6.0.0 starting...");
    
    try {
        // Load configuration
        auto& config = cf::core::Config::instance();
        config.load();
        
        // Initialize database
        auto& db = cf::db::DatabaseManager::instance();
        std::string dbPath = config.getDbPath();
        std::string dbKey = config.getDbKey();
        
        // Initialize Redis
        auto& redisCache = cf::services::RedisCacheService::instance();
        // Assuming config might have getRedisUrl() later, default to localhost for now
        redisCache.initialize("tcp://127.0.0.1:6379");
        
        // Run async initialization
        drogon::sync_wait(db.initialize(dbPath, dbKey));
        
        // Run migrations
        std::string migrationsDir = config.getMigrationsDir();
        drogon::sync_wait(db.runMigrations(migrationsDir));
        
        spdlog::info("Database ready: {}", dbPath);
        
        // Setup Drogon HTTP server
        app().setLogPath("./logs")
            .setLogLevel(trantor::Logger::kWarn)
            .addListener("0.0.0.0", config.getPort())
            .setThreadNum(config.getThreadNum());
        
        // Signal handlers
        shutdownHandler = []() {
            app().quit();
        };
        std::signal(SIGINT, signalHandler);
        std::signal(SIGTERM, signalHandler);
        
        // Start server
        spdlog::info("HTTP server starting on port {}", config.getPort());
        app().run();
        
        spdlog::info("ClickFlash Master Service stopped");
        return 0;
        
    } catch (const std::exception& e) {
        spdlog::critical("Fatal error: {}", e.what());
        return 1;
    }
}
