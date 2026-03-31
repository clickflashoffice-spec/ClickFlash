#pragma once

#include <string>
#include <memory>
#include <fstream>
#include <mutex>
#include <chrono>
#include <sstream>

namespace ClickFlash {

enum class LogLevel {
    Debug,
    Info,
    Warn,
    Error
};

class Logger {
public:
    Logger();
    ~Logger();

    void setLevel(const std::string& level);
    void setLevel(LogLevel level);
    
    void debug(const std::string& message);
    void info(const std::string& message);
    void warn(const std::string& message);
    void error(const std::string& message);

    template<typename... Args>
    void log(LogLevel level, const std::string& format, Args... args) {
        std::lock_guard<std::mutex> lock(mutex_);
        
        auto now = std::chrono::system_clock::now();
        auto time = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()) % 1000;

        std::tm tm = {};
        localtime_s(&tm, &time);

        char buffer[32];
        strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &tm);

        std::ostringstream oss;
        oss << "[" << buffer << "." << std::setfill('0') << std::setw(3) << ms.count() << "] "
            << "[" << getLevelString(level) << "] "
            << formatMessage(format, args...) << "\n";

        std::cout << oss.str();
        
        if (logFile_.is_open()) {
            logFile_ << oss.str();
            logFile_.flush();
        }
    }

private:
    std::string getLevelString(LogLevel level) const;
    
    template<typename... Args>
    std::string formatMessage(const std::string& format, Args... args) {
        if constexpr (sizeof...(args) == 0) {
            return format;
        } else {
            char buffer[4096];
            snprintf(buffer, sizeof(buffer), format.c_str(), args...);
            return std::string(buffer);
        }
    }

    LogLevel currentLevel_;
    std::ofstream logFile_;
    std::mutex mutex_;
};

}