#pragma once

#include <spdlog/spdlog.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <spdlog/sinks/stdout_color_sink.h>
#include <QCoreApplication>
#include <QDir>
#include <chrono>
#include <memory>

namespace ClickFlash {

class Logger {
public:
    static Logger& instance() {
        static Logger instance;
        return instance;
    }

    void init() {
        QString logPath = QCoreApplication::applicationDirPath() + "/logs";
        QDir().mkpath(logPath);
        
        auto fileSink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
            (logPath + "/clickflash.log").toStdString(),
            10 * 1024 * 1024,  // 10MB
            3
        );
        fileSink->set_pattern("%Y-%m-%d %H:%M:%S.%e [%l] [%n] %v");
        
        auto consoleSink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
        consoleSink->set_pattern("%H:%M:%S.%e [%l] %v");
        
        spdlog::sinks_init_list sinks = { consoleSink, fileSink };
        
        auto logger = std::make_shared<spdlog::logger>("ClickFlash", sinks);
        logger->set_level(spdlog::level::debug);
        logger->flush_on(spdlog::level::info);
        
        spdlog::register_logger(logger);
        spdlog::set_default_logger(logger);
    }

    template<typename... Args>
    static void debug(const char* fmt, Args&&... args) {
        spdlog::debug(fmt, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void info(const char* fmt, Args&&... args) {
        spdlog::info(fmt, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void warn(const char* fmt, Args&&... args) {
        spdlog::warn(fmt, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void error(const char* fmt, Args&&... args) {
        spdlog::error(fmt, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void critical(const char* fmt, Args&&... args) {
        spdlog::critical(fmt, std::forward<Args>(args)...);
    }

private:
    Logger() = default;
    ~Logger() {
        spdlog::shutdown();
    }
};

} // namespace ClickFlash

#define CF_DEBUG(...) ::ClickFlash::Logger::debug(__VA_ARGS__)
#define CF_INFO(...) ::ClickFlash::Logger::info(__VA_ARGS__)
#define CF_WARN(...) ::ClickFlash::Logger::warn(__VA_ARGS__)
#define CF_ERROR(...) ::ClickFlash::Logger::error(__VA_ARGS__)
#define CF_CRITICAL(...) ::ClickFlash::Logger::critical(__VA_ARGS__)
