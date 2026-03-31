#pragma once

#include "Router.h"
#include <QJsonObject>
#include <QJsonDocument>

namespace ClickFlash {

class JsonHelper {
public:
    static QJsonObject variantMapToJson(const QVariantMap& map) {
        QJsonObject obj;
        for (auto it = map.constBegin(); it != map.constEnd(); ++it) {
            obj[it.key()] = QJsonValue::fromVariant(it.value());
        }
        return obj;
    }
    
    static QVariantMap jsonToVariantMap(const QJsonObject& obj) {
        return obj.toVariantMap();
    }
    
    static QByteArray toJsonBytes(const QVariantMap& map) {
        QJsonObject obj = variantMapToJson(map);
        QJsonDocument doc(obj);
        return doc.toJson(QJsonDocument::Compact);
    }
    
    static QVariantMap parseJson(const QByteArray& data, QString* error = nullptr) {
        QJsonParseError parseError;
        QJsonDocument doc = QJsonDocument::fromJson(data, &parseError);
        
        if (parseError.error != QJsonParseError::NoError) {
            if (error) {
                *error = parseError.errorString();
            }
            return {};
        }
        
        if (doc.isObject()) {
            return doc.object().toVariantMap();
        }
        
        return {};
    }
};

} // namespace ClickFlash
