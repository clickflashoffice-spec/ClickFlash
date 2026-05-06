#include "services/VectorIndexService.h"
#include "core/Logger.h"

#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QIODevice>
#include <QtMath>

namespace ClickFlash {

bool VectorIndexService::initialize(const QString& indexPath) {
    m_indexPath = indexPath.isEmpty() ? "data/vector_index" : indexPath;
    m_initialized = true;
    
    CF_INFO("VectorIndexService initialized at: {}", m_indexPath.toStdString());
    return true;
}

void VectorIndexService::shutdown() {
    if (m_initialized) {
        saveIndex();
        m_faceEmbeddings.clear();
        m_imageEmbeddings.clear();
        m_photoMetadata.clear();
        m_initialized = false;
        CF_INFO("VectorIndexService shutdown");
    }
}

bool VectorIndexService::addFaceEmbedding(const QString& faceId, const QVector<float>& embedding) {
    if (!m_initialized) {
        emit error("VectorIndexService not initialized");
        return false;
    }
    
    m_faceEmbeddings[faceId] = embedding;
    CF_DEBUG("Face embedding added: {}", faceId.toStdString());
    return true;
}

bool VectorIndexService::removeFaceEmbedding(const QString& faceId) {
    return m_faceEmbeddings.remove(faceId) > 0;
}

QVector<QVariantMap> VectorIndexService::searchSimilarFaces(const QVector<float>& queryEmbedding, int topK, float threshold) {
    QVector<QPair<float, QString>> similarities;
    
    for (auto it = m_faceEmbeddings.constBegin(); it != m_faceEmbeddings.constEnd(); ++it) {
        float sim = cosineSimilarity(queryEmbedding, it.value());
        if (sim >= threshold) {
            similarities.append(qMakePair(sim, it.key()));
        }
    }
    
    // Sort by similarity descending
    std::sort(similarities.begin(), similarities.end(), [](const auto& a, const auto& b) {
        return a.first > b.first;
    });
    
    QVector<QVariantMap> results;
    for (int i = 0; i < qMin(topK, similarities.size()); ++i) {
        QVariantMap result;
        result["face_id"] = similarities[i].second;
        result["similarity"] = similarities[i].first;
        results.append(result);
    }
    
    return results;
}

bool VectorIndexService::addImageEmbedding(const QString& photoId, const QVector<float>& embedding) {
    if (!m_initialized) {
        emit error("VectorIndexService not initialized");
        return false;
    }
    
    m_imageEmbeddings[photoId] = embedding;
    CF_DEBUG("Image embedding added: {}", photoId.toStdString());
    return true;
}

bool VectorIndexService::removeImageEmbedding(const QString& photoId) {
    return m_imageEmbeddings.remove(photoId) > 0;
}

QVector<QVariantMap> VectorIndexService::searchSimilarImages(const QVector<float>& queryEmbedding, int topK) {
    QVector<QPair<float, QString>> similarities;
    
    for (auto it = m_imageEmbeddings.constBegin(); it != m_imageEmbeddings.constEnd(); ++it) {
        float sim = cosineSimilarity(queryEmbedding, it.value());
        similarities.append(qMakePair(sim, it.key()));
    }
    
    std::sort(similarities.begin(), similarities.end(), [](const auto& a, const auto& b) {
        return a.first > b.first;
    });
    
    QVector<QVariantMap> results;
    for (int i = 0; i < qMin(topK, similarities.size()); ++i) {
        QVariantMap result;
        result["photo_id"] = similarities[i].second;
        result["similarity"] = similarities[i].first;
        results.append(result);
    }
    
    return results;
}

bool VectorIndexService::indexPhotoMetadata(const QString& photoId, const QVariantMap& metadata) {
    m_photoMetadata[photoId] = metadata;
    return true;
}

QVector<QVariantMap> VectorIndexService::searchByMetadata(const QString& query, const QString& field) {
    QVector<QVariantMap> results;
    
    for (auto it = m_photoMetadata.constBegin(); it != m_photoMetadata.constEnd(); ++it) {
        if (field.isEmpty()) {
            // Search all fields
            for (auto mit = it.value().constBegin(); mit != it.value().constEnd(); ++mit) {
                if (mit.value().toString().contains(query, Qt::CaseInsensitive)) {
                    QVariantMap result = it.value();
                    result["photo_id"] = it.key();
                    results.append(result);
                    break;
                }
            }
        } else {
            // Search specific field
            if (it.value().contains(field) && 
                it.value()[field].toString().contains(query, Qt::CaseInsensitive)) {
                QVariantMap result = it.value();
                result["photo_id"] = it.key();
                results.append(result);
            }
        }
    }
    
    return results;
}

bool VectorIndexService::saveIndex() {
    QJsonObject index;
    
    // Save face embeddings
    QJsonObject faces;
    for (auto it = m_faceEmbeddings.constBegin(); it != m_faceEmbeddings.constEnd(); ++it) {
        QJsonArray embedding;
        for (float f : it.value()) {
            embedding.append(f);
        }
        faces[it.key()] = embedding;
    }
    index["faces"] = faces;
    
    // Save image embeddings
    QJsonObject images;
    for (auto it = m_imageEmbeddings.constBegin(); it != m_imageEmbeddings.constEnd(); ++it) {
        QJsonArray embedding;
        for (float f : it.value()) {
            embedding.append(f);
        }
        images[it.key()] = embedding;
    }
    index["images"] = images;
    
    // Save metadata
    QJsonObject metadata;
    for (auto it = m_photoMetadata.constBegin(); it != m_photoMetadata.constEnd(); ++it) {
        // Simple JSON conversion
        metadata[it.key()] = QJsonObject::fromVariantMap(it.value());
    }
    index["metadata"] = metadata;
    
    QJsonDocument doc(index);
    QFile file(m_indexPath + "/vector_index.json");
    if (file.open(QIODevice::WriteOnly)) {
        file.write(doc.toJson());
        file.close();
        CF_INFO("Vector index saved");
        return true;
    }
    
    return false;
}

bool VectorIndexService::loadIndex() {
    QFile file(m_indexPath + "/vector_index.json");
    if (!file.open(QIODevice::ReadOnly)) {
        CF_WARN("Vector index file not found");
        return false;
    }
    
    QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
    file.close();
    
    QJsonObject index = doc.object();
    
    // Load face embeddings
    QJsonObject faces = index["faces"].toObject();
    for (auto it = faces.keys().constBegin(); it != faces.keys().constEnd(); ++it) {
        QJsonArray embedding = faces[*it].toArray();
        QVector<float> vec;
        for (int i = 0; i < embedding.size(); ++i) {
            vec.append(embedding[i].toDouble());
        }
        m_faceEmbeddings[*it] = vec;
    }
    
    // Load image embeddings
    QJsonObject images = index["images"].toObject();
    for (auto it = images.keys().constBegin(); it != images.keys().constEnd(); ++it) {
        QJsonArray embedding = images[*it].toArray();
        QVector<float> vec;
        for (int i = 0; i < embedding.size(); ++i) {
            vec.append(embedding[i].toDouble());
        }
        m_imageEmbeddings[*it] = vec;
    }
    
    CF_INFO("Vector index loaded");
    return true;
}

QString VectorIndexService::indexStats() const {
    return QString("Faces: %1, Images: %2, Metadata: %3")
        .arg(m_faceEmbeddings.size())
        .arg(m_imageEmbeddings.size())
        .arg(m_photoMetadata.size());
}

float VectorIndexService::cosineSimilarity(const QVector<float>& a, const QVector<float>& b) {
    if (a.size() != b.size() || a.isEmpty()) return 0;
    
    float dotProduct = 0;
    float normA = 0;
    float normB = 0;
    
    for (int i = 0; i < a.size(); ++i) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    if (normA == 0 || normB == 0) return 0;
    
    return dotProduct / (qSqrt(normA) * qSqrt(normB));
}

} // namespace ClickFlash