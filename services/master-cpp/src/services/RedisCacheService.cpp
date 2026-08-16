#include "services/RedisCacheService.h"
#include <spdlog/spdlog.h>

namespace cf::services {

void RedisCacheService::initialize(const std::string& redisUrl) {
    try {
        redis_ = std::make_unique<sw::redis::Redis>(redisUrl);
        // Test connection
        redis_->ping();
        spdlog::info("Connected to Redis at {}", redisUrl);
    } catch (const sw::redis::Error& e) {
        spdlog::error("Failed to connect to Redis: {}", e.what());
    }
}

void RedisCacheService::publishEvent(const std::string& stream, const std::string& eventType, const nlohmann::json& payload) {
    if (!redis_) {
        spdlog::warn("Redis not initialized, skipping publishEvent to {}", stream);
        return;
    }
    
    try {
        redis_->xadd(stream, "*", {
            std::make_pair("type", eventType),
            std::make_pair("payload", payload.dump())
        });
        spdlog::debug("Published event {} to stream {}", eventType, stream);
    } catch (const sw::redis::Error& e) {
        spdlog::error("Failed to publish event to {}: {}", stream, e.what());
    }
}

} // namespace cf::services
