#include "workers/WatermarkWorker.h"
#include "core/Logger.h"
#include <opencv2/opencv.hpp>

namespace ClickFlash {

bool WatermarkWorker::apply(const QString& inputPath, const QString& outputPath,
                          const QString& watermarkPath, double opacity) {
    cv::Mat image = cv::imread(inputPath.toStdString());
    cv::Mat watermark = cv::imread(watermarkPath.toStdString());
    
    if (image.empty() || watermark.empty()) {
        CF_ERROR("Could not load images for watermarking");
        return false;
    }
    
    cv::Mat watermarkResized;
    cv::resize(watermark, watermarkResized, cv::Size(image.cols, image.rows));
    
    cv::Mat blended;
    cv::addWeighted(watermarkResized, opacity, image, 1.0 - opacity, 0, blended);
    
    std::vector<int> params = {cv::IMWRITE_JPEG_QUALITY, 90};
    return cv::imwrite(outputPath.toStdString(), blended, params);
}

bool WatermarkWorker::applyText(const QString& inputPath, const QString& outputPath,
                               const QString& text, const QVariantMap& options) {
    cv::Mat image = cv::imread(inputPath.toStdString());
    
    if (image.empty()) {
        CF_ERROR("Could not load image for text watermarking");
        return false;
    }
    
    QString font = options.value("font", "Arial").toString();
    double fontScale = options.value("scale", 2.0).toDouble();
    cv::Scalar color = cv::Scalar(255, 255, 255, 0.5);
    
    int thickness = options.value("thickness", 2).toInt();
    int margin = options.value("margin", 20).toInt();
    
    int baseline = 0;
    cv::Size textSize = cv::getTextSize(text.toStdString(), cv::FONT_HERSHEY_SIMPLEX,
                                        fontScale, thickness, &baseline);
    
    cv::Point point(image.cols - textSize.width - margin,
                   image.rows - textSize.height - margin);
    
    cv::Mat overlay = image.clone();
    
    cv::rectangle(overlay, 
                  cv::Point(point.x - 5, point.y + 5),
                  cv::Point(point.x + textSize.width + 5, point.y - textSize.height - 5),
                  cv::Scalar(0, 0, 0, 0.5),
                  -1);
    
    cv::addWeighted(overlay, 1 - opacity, image, opacity, 0, image);
    
    cv::putText(image, text.toStdString(), point, cv::FONT_HERSHEY_SIMPLEX,
              fontScale, color, thickness);
    
    return cv::imwrite(outputPath.toStdString(), image);
}

} // namespace ClickFlash
