#pragma once

#include "workers/WorkerPool.h"
#include <opencv2/opencv.hpp>
#include <QString>

namespace ClickFlash {

class ThumbnailWorker {
public:
    static bool generate(const QString& inputPath, const QString& outputPath, int size = 300);
    static bool generateBatch(const QVector<QString>& inputPaths, const QVector<QString>& outputPaths, int size = 300);
    
private:
    static bool resizeImage(const QString& input, const QString& output, int maxSize);
};

} // namespace ClickFlash
