#pragma once

#include <QObject>
#include <QSettings>
#include <QString>
#include <QVariant>
#include <memory>

namespace ClickFlash {

class Config : public QObject {
    Q_OBJECT

public:
    static Config& instance() {
        static Config instance;
        return instance;
    }

    void load() {
        m_settings.beginGroup("ClickFlash");
        
        m_port = m_settings.value("port", 8090).toInt();
        m_dbPath = m_settings.value("dbPath", "master.db").toString();
        m_dataDir = m_settings.value("dataDir", "data/").toString();
        m_logLevel = m_settings.value("logLevel", "info").toString();
        m_kioskMode = m_settings.value("kioskMode", false).toBool();
        m_kioskPin = m_settings.value("kioskPin", "1234").toString();
        
        m_jwtSecret = m_settings.value("jwtSecret", "change-me-in-production").toString();
        m_jwtExpiry = m_settings.value("jwtExpiry", 604800).toInt(); // 7 days
        
        m_cloudEnabled = m_settings.value("cloudEnabled", false).toBool();
        m_cloudEndpoint = m_settings.value("cloudEndpoint", "").toString();
        
        m_thumbnailSize = m_settings.value("thumbnailSize", 300).toInt();
        m_previewSize = m_settings.value("previewSize", 1200).toInt();
        m_watermarkOpacity = m_settings.value("watermarkOpacity", 0.3).toDouble();
        
        m_settings.endGroup();
        
        CF_INFO("Configuration loaded from settings");
    }

    void save() {
        m_settings.beginGroup("ClickFlash");
        
        m_settings.setValue("port", m_port);
        m_settings.setValue("dbPath", m_dbPath);
        m_settings.setValue("dataDir", m_dataDir);
        m_settings.setValue("logLevel", m_logLevel);
        m_settings.setValue("kioskMode", m_kioskMode);
        m_settings.setValue("kioskPin", m_kioskPin);
        m_settings.setValue("jwtSecret", m_jwtSecret);
        m_settings.setValue("jwtExpiry", m_jwtExpiry);
        m_settings.setValue("cloudEnabled", m_cloudEnabled);
        m_settings.setValue("cloudEndpoint", m_cloudEndpoint);
        m_settings.setValue("thumbnailSize", m_thumbnailSize);
        m_settings.setValue("previewSize", m_previewSize);
        m_settings.setValue("watermarkOpacity", m_watermarkOpacity);
        
        m_settings.endGroup();
        m_settings.sync();
        
        CF_INFO("Configuration saved");
    }

    int getPort() const { return m_port; }
    void setPort(int port) { m_port = port; }
    
    QString getDbPath() const { return m_dbPath; }
    void setDbPath(const QString& path) { m_dbPath = path; }
    
    QString getDataDir() const { return m_dataDir; }
    void setDataDir(const QString& dir) { m_dataDir = dir; }
    
    QString getLogLevel() const { return m_logLevel; }
    void setLogLevel(const QString& level) { m_logLevel = level; }
    
    bool getKioskMode() const { return m_kioskMode; }
    void setKioskMode(bool enabled) { m_kioskMode = enabled; }
    
    QString getKioskPin() const { return m_kioskPin; }
    void setKioskPin(const QString& pin) { m_kioskPin = pin; }
    
    QString getJwtSecret() const { return m_jwtSecret; }
    void setJwtSecret(const QString& secret) { m_jwtSecret = secret; }
    
    int getJwtExpiry() const { return m_jwtExpiry; }
    void setJwtExpiry(int seconds) { m_jwtExpiry = seconds; }
    
    bool getCloudEnabled() const { return m_cloudEnabled; }
    void setCloudEnabled(bool enabled) { m_cloudEnabled = enabled; }
    
    QString getCloudEndpoint() const { return m_cloudEndpoint; }
    void setCloudEndpoint(const QString& endpoint) { m_cloudEndpoint = endpoint; }
    
    int getThumbnailSize() const { return m_thumbnailSize; }
    void setThumbnailSize(int size) { m_thumbnailSize = size; }
    
    int getPreviewSize() const { return m_previewSize; }
    void setPreviewSize(int size) { m_previewSize = size; }
    
    double getWatermarkOpacity() const { return m_watermarkOpacity; }
    void setWatermarkOpacity(double opacity) { m_watermarkOpacity = opacity; }

signals:
    void configChanged();

private:
    Config(QObject* parent = nullptr) : QObject(parent), m_settings("ClickFlash", "Master") {}
    ~Config() = default;
    
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
    
    QSettings m_settings;
    
    int m_port;
    QString m_dbPath;
    QString m_dataDir;
    QString m_logLevel;
    bool m_kioskMode;
    QString m_kioskPin;
    QString m_jwtSecret;
    int m_jwtExpiry;
    bool m_cloudEnabled;
    QString m_cloudEndpoint;
    int m_thumbnailSize;
    int m_previewSize;
    double m_watermarkOpacity;
};

} // namespace ClickFlash
