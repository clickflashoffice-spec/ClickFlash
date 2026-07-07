#include "utils/ImageProcessor.h"
#include "core/Logger.h"
#include "core/Config.h"
#include <QFile>
#include <QFileInfo>
#include <QImage>
#include <QPainter>
#include <QFont>
#include <QDateTime>

namespace ClickFlash {

ImageProcessor::ProcessingResult ImageProcessor::generateThumbnail(const QString& inputPath, const QString& outputPath, int maxSize) {
    ProcessingResult result;

    QImage image(inputPath);
    if (image.isNull()) {
        result.success = false;
        result.error = QString("Failed to load image: %1").arg(inputPath);
        CF_ERROR("Thumbnail generation failed: {}", result.error.toStdString());
        return result;
    }

    QImage thumbnail = image.scaled(maxSize, maxSize, Qt::KeepAspectRatio, Qt::SmoothTransformation);

    if (!thumbnail.save(outputPath, nullptr, 95)) {
        result.success = false;
        result.error = QString("Failed to save thumbnail: %1").arg(outputPath);
        CF_ERROR("Thumbnail save failed: {}", result.error.toStdString());
        return result;
    }

    QFileInfo fileInfo(outputPath);
    result.success = true;
    result.outputPath = outputPath;
    result.width = thumbnail.width();
    result.height = thumbnail.height();
    result.fileSize = fileInfo.size();

    CF_DEBUG("Thumbnail generated: {} -> {} ({}x{})", inputPath.toStdString(), outputPath.toStdString(), result.width, result.height);
    return result;
}

ImageProcessor::ProcessingResult ImageProcessor::generatePreview(const QString& inputPath, const QString& outputPath, int maxSize) {
    ProcessingResult result;

    QImage image(inputPath);
    if (image.isNull()) {
        result.success = false;
        result.error = QString("Failed to load image: %1").arg(inputPath);
        CF_ERROR("Preview generation failed: {}", result.error.toStdString());
        return result;
    }

    QImage preview = image.scaled(maxSize, maxSize, Qt::KeepAspectRatio, Qt::SmoothTransformation);

    if (!preview.save(outputPath, nullptr, 90)) {
        result.success = false;
        result.error = QString("Failed to save preview: %1").arg(outputPath);
        CF_ERROR("Preview save failed: {}", result.error.toStdString());
        return result;
    }

    QFileInfo fileInfo(outputPath);
    result.success = true;
    result.outputPath = outputPath;
    result.width = preview.width();
    result.height = preview.height();
    result.fileSize = fileInfo.size();

    CF_DEBUG("Preview generated: {} -> {} ({}x{})", inputPath.toStdString(), outputPath.toStdString(), result.width, result.height);
    return result;
}

ImageProcessor::ProcessingResult ImageProcessor::applyWatermark(const QString& inputPath, const QString& outputPath, const WatermarkOptions& options) {
    ProcessingResult result;

    QImage image(inputPath);
    if (image.isNull()) {
        result.success = false;
        result.error = QString("Failed to load image: %1").arg(inputPath);
        CF_ERROR("Watermark failed: {}", result.error.toStdString());
        return result;
    }

    QImage watermarked = image;
    QPainter painter(&watermarked);
    painter.setRenderHint(QPainter::Antialiasing);
    painter.setRenderHint(QPainter::TextAntialiasing);

    painter.setOpacity(options.opacity);

    QFont font = painter.font();
    font.setPixelSize(options.fontSize);
    painter.setFont(font);

    QColor textColor(options.color);
    painter.setPen(textColor);

    QString text = options.text;
    if (!text.isEmpty()) {
        QRect textRect = painter.fontMetrics().boundingRect(text);
        int x, y;

        if (options.position == "top-left") {
            x = options.margin;
            y = options.margin + textRect.height();
        } else if (options.position == "top-right") {
            x = watermarked.width() - textRect.width() - options.margin;
            y = options.margin + textRect.height();
        } else if (options.position == "bottom-left") {
            x = options.margin;
            y = watermarked.height() - options.margin;
        } else {
            x = watermarked.width() - textRect.width() - options.margin;
            y = watermarked.height() - options.margin;
        }

        painter.drawText(x, y, text);
    }

    if (!options.imagePath.isEmpty()) {
        QImage watermarkImage(options.imagePath);
        if (!watermarkImage.isNull()) {
            int x = watermarked.width() - watermarkImage.width() - options.margin;
            int y = watermarked.height() - watermarkImage.height() - options.margin;
            painter.drawImage(x, y, watermarkImage);
        }
    }

    painter.end();

    if (!watermarked.save(outputPath, nullptr, 95)) {
        result.success = false;
        result.error = QString("Failed to save watermarked image: %1").arg(outputPath);
        CF_ERROR("Watermark save failed: {}", result.error.toStdString());
        return result;
    }

    QFileInfo fileInfo(outputPath);
    result.success = true;
    result.outputPath = outputPath;
    result.width = watermarked.width();
    result.height = watermarked.height();
    result.fileSize = fileInfo.size();

    CF_DEBUG("Watermark applied: {} -> {}", inputPath.toStdString(), outputPath.toStdString());
    return result;
}

ImageProcessor::ProcessingResult ImageProcessor::resize(const QString& inputPath, const QString& outputPath, int width, int height, bool maintainAspect) {
    ProcessingResult result;

    QImage image(inputPath);
    if (image.isNull()) {
        result.success = false;
        result.error = QString("Failed to load image: %1").arg(inputPath);
        return result;
    }

    QImage resized;
    if (maintainAspect) {
        resized = image.scaled(width, height, Qt::KeepAspectRatio, Qt::SmoothTransformation);
    } else {
        resized = image.scaled(width, height, Qt::IgnoreAspectRatio, Qt::SmoothTransformation);
    }

    if (!resized.save(outputPath, nullptr, 95)) {
        result.success = false;
        result.error = QString("Failed to save resized image: %1").arg(outputPath);
        return result;
    }

    QFileInfo fileInfo(outputPath);
    result.success = true;
    result.outputPath = outputPath;
    result.width = resized.width();
    result.height = resized.height();
    result.fileSize = fileInfo.size();

    return result;
}

ImageProcessor::ProcessingResult ImageProcessor::crop(const QString& inputPath, const QString& outputPath, int x, int y, int width, int height) {
    ProcessingResult result;

    QImage image(inputPath);
    if (image.isNull()) {
        result.success = false;
        result.error = QString("Failed to load image: %1").arg(inputPath);
        return result;
    }

    QImage cropped = image.copy(x, y, width, height);

    if (!cropped.save(outputPath, nullptr, 95)) {
        result.success = false;
        result.error = QString("Failed to save cropped image: %1").arg(outputPath);
        return result;
    }

    QFileInfo fileInfo(outputPath);
    result.success = true;
    result.outputPath = outputPath;
    result.width = cropped.width();
    result.height = cropped.height();
    result.fileSize = fileInfo.size();

    return result;
}

ImageProcessor::ProcessingResult ImageProcessor::rotate(const QString& inputPath, const QString& outputPath, double degrees) {
    ProcessingResult result;

    QImage image(inputPath);
    if (image.isNull()) {
        result.success = false;
        result.error = QString("Failed to load image: %1").arg(inputPath);
        return result;
    }

    QTransform transform;
    transform.rotate(degrees);
    QImage rotated = image.transformed(transform, Qt::SmoothTransformation);

    if (!rotated.save(outputPath, nullptr, 95)) {
        result.success = false;
        result.error = QString("Failed to save rotated image: %1").arg(outputPath);
        return result;
    }

    QFileInfo fileInfo(outputPath);
    result.success = true;
    result.outputPath = outputPath;
    result.width = rotated.width();
    result.height = rotated.height();
    result.fileSize = fileInfo.size();

    return result;
}

QJsonObject ImageProcessor::getImageMetadata(const QString& imagePath) {
    QJsonObject metadata;

    QFileInfo fileInfo(imagePath);
    if (!fileInfo.exists()) {
        return metadata;
    }

    QImage image(imagePath);
    if (image.isNull()) {
        return metadata;
    }

    metadata["width"] = image.width();
    metadata["height"] = image.height();
    metadata["format"] = getOutputFormat(imagePath);
    metadata["fileSize"] = fileInfo.size();
    metadata["fileName"] = fileInfo.fileName();
    metadata["modifiedAt"] = fileInfo.lastModified().toString(Qt::ISODate);

    return metadata;
}

bool ImageProcessor::validateImage(const QString& imagePath) {
    QImage image(imagePath);
    return !image.isNull();
}

QString ImageProcessor::getOutputFormat(const QString& path) {
    QString ext = QFileInfo(path).suffix().toLower();
    if (ext == "jpg" || ext == "jpeg") return "JPEG";
    if (ext == "png") return "PNG";
    if (ext == "webp") return "WEBP";
    if (ext == "bmp") return "BMP";
    return "PNG";
}

} // namespace ClickFlash
