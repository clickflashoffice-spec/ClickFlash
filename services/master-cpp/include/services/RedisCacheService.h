#pragma once

#include <sw/redis++/redis++.h>
#include <string>
#include <nlohmann/json.hpp>
#include <memory>

namespace cf::services {

class RedisCacheService {
public:
    static RedisCacheService& instance() {
        static RedisCacheService s_instance;
        return s_instance;
    }

    void initialize(const std::string& redisUrl = "tcp://127.0.0.1:6379");
    
    // Publish event using Redis Streams (XADD)
    void publishEvent(const std::string& stream, const std::string& eventType, const nlohmann::json& payload);

private:
    RedisCacheService() = default;
    ~RedisCacheService() = default;
    RedisCacheService(const RedisCacheService&) = delete;
    RedisCacheService& operator=(const RedisCacheService&) = delete;

    std::unique_ptr<sw::redis::Redis> redis_;
};

} // namespace cf::services
