#include "core/Logger.h"
#include <iostream>
#include <iomanip>
#include <ctime>

namespace ClickFlash {

Logger::Logger() : currentLevel_(LogLevel::Info) {
    logFile_.open("logs/clickflash.log", std::ios::app);
    if (!logFile_.is_open()) {
        std::cerr << "Warning: Could not open log file" << std::endl;
    }
}

Logger::~Logger() {
    if (logFile_.is_open()) {
        logFile_.close();
    }
}

void Logger::setLevel(const std::string& level) {
    if (level == "debug") currentLevel_ = LogLevel::Debug;
    else if (level == "info") currentLevel_ = LogLevel::Info;
    else if (level == "warn") currentLevel_ = LogLevel::Warn;
    else if (level == "error") currentLevel_ = LogLevel::Error;
}

void Logger::setLevel(LogLevel level) {
    currentLevel_ = level;
}

void Logger::debug(const std::string& message) {
    if (currentLevel_ <= LogLevel::Debug) {
        log(LogLevel::Debug, "{}", message);
    }
}

void Logger::info(const std::string& message) {
    if (currentLevel_ <= LogLevel::Info) {
        log(LogLevel::Info, "{}", message);
    }
}

void Logger::warn(const std::string& message) {
    if (currentLevel_ <= LogLevel::Warn) {
        log(LogLevel::Warn, "{}", message);
    }
}

void Logger::error(const std::string& message) {
    if (currentLevel_ <= LogLevel::Error) {
        log(LogLevel::Error, "{}", message);
    }
}

std::string Logger::getLevelString(LogLevel level) const {
    switch (level) {
        case LogLevel::Debug: return "DEBUG";
        case LogLevel::Info: return "INFO";
        case LogLevel::Warn: return "WARN";
        case LogLevel::Error: return "ERROR";
        default: return "UNKNOWN";
    }
}

}