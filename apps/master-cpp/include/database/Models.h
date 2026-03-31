#pragma once

#include <string>
#include <vector>
#include <optional>
#include <chrono>
#include <cstdint>

namespace ClickFlash {

struct User {
    int64_t id;
    std::string username;
    std::string passwordHash;
    std::string email;
    std::string role;
    bool isActive;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;
    std::string machineId;
};

struct Album {
    int64_t id;
    std::string name;
    std::string description;
    int64_t photographerId;
    std::string eventDate;
    std::string status;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;
    std::string accessCode;
    int photoCount;
};

struct Photo {
    int64_t id;
    int64_t albumId;
    std::string filename;
    std::string originalPath;
    std::string thumbnailPath;
    std::string previewPath;
    std::string fullPath;
    int width;
    int height;
    int64_t fileSize;
    std::string mimeType;
    std::string orientation;
    std::string rating;
    bool isFavorite;
    bool isRejected;
    std::string faces;
    std::string metadata;
    std::chrono::system_clock::time_point capturedAt;
    std::chrono::system_clock::time_point importedAt;
    std::string preset;
    std::string presetData;
};

struct Order {
    int64_t id;
    std::string orderNumber;
    int64_t albumId;
    int64_t customerId;
    double totalAmount;
    std::string status;
    std::string paymentStatus;
    std::string paymentMethod;
    std::string stripePaymentId;
    std::string customerEmail;
    std::string customerName;
    std::string customerPhone;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;
    std::chrono::system_clock::time_point fulfilledAt;
    std::string galleryUrl;
    std::string notes;
};

struct Booking {
    int64_t id;
    int64_t photographerId;
    std::string clientName;
    std::string clientEmail;
    std::string clientPhone;
    std::string eventType;
    std::string eventDate;
    std::string eventTime;
    std::string location;
    std::string status;
    double price;
    double depositPaid;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;
    std::string notes;
};

struct Kiosk {
    int64_t id;
    std::string kioskId;
    std::string name;
    std::string pairingCode;
    std::string status;
    std::string lastSeenIp;
    std::chrono::system_clock::time_point lastSeenAt;
    std::chrono::system_clock::time_point createdAt;
    std::string machineId;
    bool isActive;
};

struct Face {
    int64_t id;
    std::string photoId;
    float embedding[512];
    std::string boundingBox;
    float confidence;
    std::string label;
    std::chrono::system_clock::time_point createdAt;
};

struct SyncRecord {
    int64_t id;
    std::string tableName;
    int64_t recordId;
    std::string operation;
    std::string data;
    bool synced;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point syncedAt;
};

struct AnalyticsEvent {
    int64_t id;
    std::string eventType;
    std::string userId;
    std::string sessionId;
    std::string properties;
    std::chrono::system_clock::time_point timestamp;
};

struct SessionType {
    int64_t id;
    std::string name;
    std::string description;
    double basePrice;
    int durationMinutes;
    std::string includedDeliverables;
    std::string isActive;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;
};

struct MarketingCampaign {
    int64_t id;
    std::string name;
    std::string type;
    std::string status;
    std::string targetAudience;
    std::chrono::system_clock::time_point startDate;
    std::chrono::system_clock::time_point endDate;
    int totalRecipients;
    int deliveredCount;
    int openCount;
    int clickCount;
    std::chrono::system_clock::time_point createdAt;
};

struct LedgerEntry {
    int64_t id;
    std::string type;
    std::string category;
    double amount;
    std::string description;
    std::string referenceId;
    std::string referenceType;
    std::chrono::system_clock::time_point date;
    std::chrono::system_clock::time_point createdAt;
};

}