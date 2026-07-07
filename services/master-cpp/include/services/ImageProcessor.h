#pragma once
#include <string>
#include <nlohmann/json.hpp>

class ImageProcessor {
public:
    static nlohmann::json processPhoto(const std::string& filepath, const std::string& outputDir, const std::string& photoId, const std::string& ext);
};
