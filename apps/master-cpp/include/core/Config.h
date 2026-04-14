#pragma once

#include <QObject>
#include <QSettings>
#include <QString>
#include <QVariant>
#include <QJsonObject>
#include <QUuid>
#include <memory>
#include "core/Logger.h"

namespace ClickFlash {

class Config : public QObject {
    Q_OBJECT

public:
    static Config& instance();

    Config(QObject* parent = nullptr);
    ~Config() = default;
    
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
    
    void load();
    void save();
    
    QString getSettingsFilePath() const;
    QJsonObject getAllSettings() const;
    void updateSettings(const QJsonObject& settings);
    void applySettings();
    
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
    
    int getJwtExpiry() const { return m_jwtExpiryDays; }
    void setJwtExpiry(int seconds) { m_jwtExpiryDays = seconds; }
    
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

Q_SIGNALS:
    void configChanged();
    void settingChanged(const QString& key, const QVariant& value);

private:
    QSettings m_settings;
    
    QString m_machineId;
    QString m_databasePath;
    int m_port;
    QString m_logLevel;
    bool m_darkMode;
    QString m_jwtSecret;
    int m_jwtExpiryDays;
    QString m_kioskSigningSecret;
    QString m_originalsPath;
    QString m_thumbnailsPath;
    QString m_watermarksPath;
    bool m_kioskModeEnabled;
    QString m_cloudSyncUrl;
    
    int m_thumbnailSize;
    int m_previewSize;
    double m_watermarkOpacity;
    
    QString m_dbPath;
    QString m_dataDir;
    bool m_kioskMode;
    QString m_kioskPin;
    bool m_cloudEnabled;
    QString m_cloudEndpoint;
};

} // namespace ClickFlash
