#pragma once

#include <QString>
#include <QVector>
#include <QVariantMap>

namespace ClickFlash {

struct FaceDetectionResult {
    QString photoId;
    QVector<QVariantMap> faces;
    int faceCount;
};

class FaceWorker {
public:
    static FaceDetectionResult detect(const QString& photoPath);
    static bool enroll(const QString& userId, const QString& photoPath);
    static QVector<QVariantMap> search(const QString& query, int limit = 10);
    static void reindexAlbum(const QString& albumId);
};

} // namespace ClickFlash
