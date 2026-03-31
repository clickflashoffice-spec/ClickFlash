#include "workers/ThumbnailWorker.h"
#include "core/Logger.h"

namespace ClickFlash {

bool ThumbnailWorker::generate(const QString& inputPath, const QString& outputPath, int size) {
    return resizeImage(inputPath, outputPath, size);
}

bool ThumbnailWorker::generateBatch(const QVector<QString>& inputPaths, 
                                  const QVector<QString>& outputPaths, int size) {
    if (inputPaths.size() != outputPaths.size()) {
        CF_ERROR("Input and output path counts don't match");
        return false;
    }
    
    for (int i = 0; i < inputPaths.size(); ++i) {
        if (!resizeImage(inputPaths[i], outputPaths[i], size)) {
            CF_ERROR("Failed to generate thumbnail for {}", inputPaths[i].toStdString());
            return false;
        }
    }
    
    return true;
}

bool ThumbnailWorker::resizeImage(const QString& input, const QString& output, int maxSize) {
    cv::Mat image = cv::imread(input.toStdString());
    
    if (image.empty()) {
        CF_ERROR("Could not load image: {}", input.toStdString());
        return false;
    }
    
    int width = image.cols;
    int height = image.rows;
    
    float scale = 1.0f;
    if (width > height) {
        scale = static_cast<float>(maxSize) / width;
    } else {
        scale = static_cast<float>(maxSize) / height;
    }
    
    int newWidth = static_cast<int>(width * scale);
    int newHeight = static_cast<int>(height * scale);
    
    cv::Mat resized;
    cv::resize(image, resized, cv::Size(newWidth, newHeight), 0, 0, cv::INTER_AREA);
    
    std::vector<int> params = {cv::IMWRITE_JPEG_QUALITY, 85};
    bool success = cv::imwrite(output.toStdString(), resized, params);
    
    if (!success) {
        CF_ERROR("Failed to write thumbnail: {}", output.toStdString());
    }
    
    return success;
}

} // namespace ClickFlash
