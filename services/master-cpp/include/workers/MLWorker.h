#pragma once

#include <QString>
#include <QVector>
#include <QVariantMap>

namespace ClickFlash {

class MLWorker {
public:
    static double analyzePhotoQuality(const QString& photoPath);
    static QVector<QVariantMap> autoCullAlbum(const QString& albumId, double threshold = 0.5);
    static void trainModel(const QString& modelPath);
};

} // namespace ClickFlash
