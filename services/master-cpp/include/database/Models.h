#pragma once

#include <QString>
#include <QVariantMap>
#include <QDateTime>
#include <optional>

namespace ClickFlash {

struct User {
    int id;
    QString email;
    QString name;
    QString role;  // CEO, Manager, Admin, Photographer
    QString avatarUrl;
    bool active;
    QDateTime createdAt;
    QDateTime updatedAt;
};

struct Album {
    QString id;
    QString name;
    QString description;
    int photographerId;
    QString destinationId;
    QString coverPhotoId;
    int photoCount;
    QString status;  // draft, active, archived
    QDateTime shootDate;
    QDateTime createdAt;
    QDateTime updatedAt;
};

struct Photo {
    QString id;
    QString albumId;
    QString url;
    QString title;
    int photographerId;
    QString category;
    QVariantMap metadata;
    QVariantMap manualEdits;
    QString thumbnailUrl;
    QString previewUrl;
    QString tinyUrl;
    QString storagePath;
    int fileSize;
    int width;
    int height;
    QString fileHash;
    QVariantMap qualityFlags;
    QString cullingStatus;  // pending, approved, rejected
    QString syncStatus;
    QDateTime createdAt;
};

struct Order {
    QString id;
    QString albumId;
    QString customerName;
    QString customerEmail;
    QString status;  // pending, approved, processing, printing, shipped, delivered, cancelled
    QVariantList items;
    double subtotal;
    double tax;
    double total;
    QString galleryToken;
    QDateTime createdAt;
    QDateTime updatedAt;
};

struct Booking {
    QString id;
    int photographerId;
    QString sessionType;
    QString destinationId;
    QString customerName;
    QString customerEmail;
    QString customerPhone;
    QDateTime scheduledAt;
    int duration;
    QString status;  // scheduled, completed, cancelled
    QString notes;
    QDateTime createdAt;
};

struct Product {
    QString id;
    QString name;
    QString description;
    QString type;  // print, digital, package
    double price;
    QString sku;
    bool active;
    QDateTime createdAt;
};

struct Kiosk {
    QString id;
    QString name;
    QString pairingToken;
    QString pairingSecret;
    QString status;  // paired, unpaired, offline
    QDateTime lastSeen;
    QDateTime pairedAt;
};

struct Setting {
    QString key;
    QVariant value;
    QString type;  // string, int, bool, json
    QDateTime updatedAt;
};

} // namespace ClickFlash
