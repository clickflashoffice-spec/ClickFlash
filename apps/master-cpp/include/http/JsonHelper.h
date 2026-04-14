#pragma once

#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QJsonValue>
#include <QString>
#include <QVariant>
#include <QVariantMap>

namespace ClickFlash {

class JsonHelper {
public:
    static QJsonDocument parse(const QString& jsonString);
    static QJsonDocument parse(const QByteArray& jsonBytes);
    static QVariant parseVariant(const QString& jsonString);
    static QVariant parseVariant(const QByteArray& jsonBytes);
    
    static QString toString(const QJsonDocument& doc);
    static QString toString(const QJsonObject& obj);
    static QString toString(const QJsonArray& arr);
    
    static QByteArray toBytes(const QJsonDocument& doc);
    static QByteArray toBytes(const QJsonObject& obj);
    
    static QJsonObject variantToJson(const QVariant& variant);
    static QVariant jsonToVariant(const QJsonValue& value);
    
    static bool isValidJson(const QString& jsonString);
    static bool isValidJson(const QByteArray& jsonBytes);
    
    static QString formatJson(const QString& jsonString);
    static QString formatJson(const QByteArray& jsonBytes);
    
    static QJsonObject fromVariantMap(const QVariantMap& map);
    static QVariantMap toVariantMap(const QJsonObject& obj);
    
    static QJsonArray fromStringList(const QStringList& list);
    static QStringList toStringList(const QJsonArray& arr);
    
    static QString escapeString(const QString& str);
    static QString unescapeString(const QString& str);

private:
    JsonHelper() = default;
};

} // namespace ClickFlash