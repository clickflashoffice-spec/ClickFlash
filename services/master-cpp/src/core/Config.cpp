#include "core/Config.h"
#include "core/Logger.h"
#include <QCoreApplication>
#include <QDir>
#include <QStandardPaths>

namespace ClickFlash {

Config& Config::instance() {
    static Config instance;
    return instance;
}

Config::Config(QObject* parent)
    : QObject(parent)
    , m_settings("ClickFlash", "ClickFlashMaster")
{
    m_machineId = QUuid::createUuid().toString(QUuid::WithoutBraces);
}

QString Config::getSettingsFilePath() const {
    return QStandardPaths::writableLocation(QStandardPaths::AppConfigLocation) + "/settings.json";
}

void Config::load() {
    CF_INFO("Loading configuration...");

    m_databasePath = m_settings.value("database/path", 
        QCoreApplication::applicationDirPath() + "/data/clickflash.db").toString();
    m_port = m_settings.value("server/port", 8090).toInt();
    m_logLevel = m_settings.value("logging/level", "info").toString();
    m_darkMode = m_settings.value("ui/darkMode", true).toBool();
    m_jwtSecret = m_settings.value("auth/jwtSecret", 
        QUuid::createUuid().toString(QUuid::WithoutBraces)).toString();
    m_jwtExpiryDays = m_settings.value("auth/jwtExpiryDays", 7).toInt();
    m_kioskSigningSecret = m_settings.value("kiosk/signingSecret", 
        QUuid::createUuid().toString(QUuid::WithoutBraces)).toString();
    
    QString defaultOriginals = QStandardPaths::writableLocation(QStandardPaths::PicturesLocation) + "/ClickFlash/Originals";
    QString defaultThumbs = QCoreApplication::applicationDirPath() + "/thumbnails";
    QString defaultWatermarks = QCoreApplication::applicationDirPath() + "/watermarks";
    
    m_originalsPath = m_settings.value("paths/originals", defaultOriginals).toString();
    m_thumbnailsPath = m_settings.value("paths/thumbnails", defaultThumbs).toString();
    m_watermarksPath = m_settings.value("paths/watermarks", defaultWatermarks).toString();
    m_kioskModeEnabled = m_settings.value("kiosk/enabled", false).toBool();
    m_cloudSyncUrl = m_settings.value("cloud/syncUrl", "").toString();

    QDir().mkpath(m_originalsPath);
    QDir().mkpath(m_thumbnailsPath);
    QDir().mkpath(m_watermarksPath);

    CF_INFO("Configuration loaded - Port: {}, Dark mode: {}", m_port, m_darkMode);
}

void Config::save() {
    m_settings.setValue("database/path", m_databasePath);
    m_settings.setValue("server/port", m_port);
    m_settings.setValue("logging/level", m_logLevel);
    m_settings.setValue("ui/darkMode", m_darkMode);
    m_settings.setValue("auth/jwtSecret", m_jwtSecret);
    m_settings.setValue("auth/jwtExpiryDays", m_jwtExpiryDays);
    m_settings.setValue("kiosk/signingSecret", m_kioskSigningSecret);
    m_settings.setValue("paths/originals", m_originalsPath);
    m_settings.setValue("paths/thumbnails", m_thumbnailsPath);
    m_settings.setValue("paths/watermarks", m_watermarksPath);
    m_settings.setValue("kiosk/enabled", m_kioskModeEnabled);
    m_settings.setValue("cloud/syncUrl", m_cloudSyncUrl);

    CF_INFO("Configuration saved");
}

QJsonObject Config::getAllSettings() const {
    return QJsonObject{
        {"port", m_port},
        {"databasePath", m_databasePath},
        {"logLevel", m_logLevel},
        {"darkMode", m_darkMode},
        {"jwtExpiryDays", m_jwtExpiryDays},
        {"originalsPath", m_originalsPath},
        {"thumbnailsPath", m_thumbnailsPath},
        {"watermarksPath", m_watermarksPath},
        {"kioskModeEnabled", m_kioskModeEnabled},
        {"cloudSyncUrl", m_cloudSyncUrl},
        {"machineId", m_machineId}
    };
}

void Config::updateSettings(const QJsonObject& settings) {
    if (settings.contains("port")) m_port = settings["port"].toInt();
    if (settings.contains("databasePath")) m_databasePath = settings["databasePath"].toString();
    if (settings.contains("logLevel")) m_logLevel = settings["logLevel"].toString();
    if (settings.contains("darkMode")) m_darkMode = settings["darkMode"].toBool();
    if (settings.contains("jwtExpiryDays")) m_jwtExpiryDays = settings["jwtExpiryDays"].toInt();
    if (settings.contains("originalsPath")) m_originalsPath = settings["originalsPath"].toString();
    if (settings.contains("thumbnailsPath")) m_thumbnailsPath = settings["thumbnailsPath"].toString();
    if (settings.contains("watermarksPath")) m_watermarksPath = settings["watermarksPath"].toString();
    if (settings.contains("kioskModeEnabled")) m_kioskModeEnabled = settings["kioskModeEnabled"].toBool();
    if (settings.contains("cloudSyncUrl")) m_cloudSyncUrl = settings["cloudSyncUrl"].toString();

    applySettings();
    save();

    for (auto it = settings.begin(); it != settings.end(); ++it) {
        Q_EMIT settingChanged(it.key(), it.value().toVariant());
    }
}

void Config::applySettings() {
    CF_INFO("Applying configuration changes...");
}

} // namespace ClickFlash
