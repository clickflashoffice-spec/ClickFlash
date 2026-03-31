#pragma once

#include <QObject>
#include <QProcess>
#include <QTimer>
#include <QString>
#include <QByteArray>

namespace ClickFlash {

class ImageProcessor : public QObject {
    Q_OBJECT

public:
    static ImageProcessor& instance() {
        static ImageProcessor instance;
        return instance;
    }
    
    bool generateThumbnail(const QString& inputPath, const QString& outputPath, int size = 300) {
        return processImage(inputPath, outputPath, QString("-resize %1x%1 -quality 80").arg(size));
    }
    
    bool generatePreview(const QString& inputPath, const QString& outputPath, int maxSize = 1200) {
        return processImage(inputPath, outputPath, QString("-resize %1x%1 -quality 85").arg(maxSize));
    }
    
    bool applyWatermark(const QString& inputPath, const QString& outputPath, 
                        const QString& watermarkPath, double opacity = 0.3) {
        return processImage(inputPath, outputPath, 
            QString("-composite -dissolve %1 %2").arg(static_cast<int>(opacity * 100)).arg(watermarkPath));
    }
    
    QByteArray getImageMetadata(const QString& path) {
        QProcess process;
        process.start("magick", {"identify", "-verbose", path});
        process.waitForFinished();
        
        return process.readAllStandardOutput();
    }
    
signals:
    void processingComplete(const QString& inputPath, const QString& outputPath, bool success);
    void progressUpdated(int percent);

private:
    ImageProcessor(QObject* parent = nullptr) : QObject(parent) {}
    
    bool processImage(const QString& input, const QString& output, const QString& args) {
        QStringList arguments;
        arguments << input.path() << args.split(' ') << output.path();
        
        QProcess process;
        process.start("magick", arguments);
        bool finished = process.waitForFinished(30000);
        
        if (finished && process.exitCode() == 0) {
            emit processingComplete(input, output, true);
            return true;
        }
        
        emit processingComplete(input, output, false);
        return false;
    }
};

} // namespace ClickFlash
