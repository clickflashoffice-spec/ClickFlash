#pragma once

#include <QString>
#include <QVariantMap>

namespace ClickFlash {

class WatermarkWorker {
public:
    static bool apply(const QString& inputPath, const QString& outputPath, 
                     const QString& watermarkPath, double opacity = 0.3);
    static bool applyText(const QString& inputPath, const QString& outputPath,
                         const QString& text, const QVariantMap& options = {});
};

} // namespace ClickFlash
