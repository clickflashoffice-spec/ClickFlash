#pragma once

#include <QObject>
#include <QString>
#include <QVector>
#include <QVariantMap>

namespace ClickFlash {

class VectorIndexService : public QObject {
    Q_OBJECT

public:
    static VectorIndexService& instance() {
        static VectorIndexService instance;
        return instance;
    }

    bool initialize(const QString& indexPath = "");
    void shutdown();
    
    // Face embeddings
    bool addFaceEmbedding(const QString& faceId, const QVector<float>& embedding);
    bool removeFaceEmbedding(const QString& faceId);
    QVector<QVariantMap> searchSimilarFaces(const QVector<float>& queryEmbedding, int topK = 10, float threshold = 0.7f);
    
    // Image embeddings for similarity search
    bool addImageEmbedding(const QString& photoId, const QVector<float>& embedding);
    bool removeImageEmbedding(const QString& photoId);
    QVector<QVariantMap> searchSimilarImages(const QVector<float>& queryEmbedding, int topK = 10);
    
    // Metadata indexing
    bool indexPhotoMetadata(const QString& photoId, const QVariantMap& metadata);
    QVector<QVariantMap> searchByMetadata(const QString& query, const QString& field = "");
    
    // Index management
    bool saveIndex();
    bool loadIndex();
    QString indexStats() const;

signals:
    void indexingStarted();
    void indexingProgress(int percent);
    void indexingCompleted();
    void error(const QString& message);

private:
    VectorIndexService(QObject* parent = nullptr) : QObject(parent), m_initialized(false) {}
    ~VectorIndexService() { shutdown(); }
    
    VectorIndexService(const VectorIndexService&) = delete;
    VectorIndexService& operator=(const VectorIndexService&) = delete;
    
    bool m_initialized;
    QString m_indexPath;
    
    // In-memory index structures
    QMap<QString, QVector<float>> m_faceEmbeddings;
    QMap<QString, QVector<float>> m_imageEmbeddings;
    QMap<QString, QVariantMap> m_photoMetadata;
    
    float cosineSimilarity(const QVector<float>& a, const QVector<float>& b);
};

} // namespace ClickFlash