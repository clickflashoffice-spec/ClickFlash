#pragma once

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include "database/DatabaseManager.h"
#include "core/Config.h"

namespace ClickFlash {

class OrderService {
public:
    explicit OrderService(DatabaseManager* db);
    ~OrderService() = default;

    struct Order {
        int64_t id;
        std::string orderNumber;
        int64_t albumId;
        int64_t customerId;
        double totalAmount;
        std::string status;
        std::string paymentStatus;
        std::string paymentMethod;
        std::string customerEmail;
        std::string customerName;
        std::string customerPhone;
        std::string galleryUrl;
        std::string notes;
    };

    struct OrderItem {
        int64_t id;
        int64_t orderId;
        std::string productType;
        int quantity;
        double unitPrice;
        double totalPrice;
        std::string metadata;
    };

    int64_t createOrder(int64_t albumId, const std::string& customerEmail, 
                        const std::string& customerName, const std::string& customerPhone);
    bool updateOrderStatus(int64_t orderId, const std::string& status);
    bool updatePaymentStatus(int64_t orderId, const std::string& paymentStatus, 
                             const std::string& paymentMethod, const std::string& stripePaymentId);
    bool deleteOrder(int64_t orderId);
    std::optional<Order> getOrder(int64_t orderId);
    std::optional<Order> getOrderByNumber(const std::string& orderNumber);
    std::vector<Order> getAllOrders();
    std::vector<Order> getOrdersByAlbum(int64_t albumId);
    std::vector<Order> getOrdersByCustomer(const std::string& email);
    std::vector<Order> getOrdersByStatus(const std::string& status);

    bool addOrderItem(int64_t orderId, const std::string& productType, 
                      int quantity, double unitPrice, const std::string& metadata);
    std::vector<OrderItem> getOrderItems(int64_t orderId);

    std::string generateOrderNumber();

private:
    DatabaseManager* db_;
};

class SyncService {
public:
    explicit SyncService(DatabaseManager* db, Config* config);
    ~SyncService() = default;

    struct SyncRecord {
        int64_t id;
        std::string tableName;
        int64_t recordId;
        std::string operation;
        std::string data;
        bool synced;
    };

    void recordChange(const std::string& tableName, int64_t recordId, 
                     const std::string& operation, const std::string& data);
    std::vector<SyncRecord> getUnsyncedChanges();
    bool markAsSynced(int64_t recordId);
    bool syncToCloud();
    bool syncFromCloud();

private:
    DatabaseManager* db_;
    Config* config_;
};

class RealtimeService {
public:
    RealtimeService();
    ~RealtimeService() = default;

    using ConnectionCallback = std::function<void(int64_t connectionId)>;
    using MessageCallback = std::function<void(int64_t connectionId, const std::string& message)>;

    int64_t addConnection(ConnectionCallback onConnect, ConnectionCallback onDisconnect, 
                           MessageCallback onMessage);
    void removeConnection(int64_t connectionId);
    void broadcast(const std::string& message);
    void sendTo(int64_t connectionId, const std::string& message);

private:
    int64_t nextConnectionId_;
    std::unordered_map<int64_t, ConnectionCallback> onConnect_;
    std::unordered_map<int64_t, ConnectionCallback> onDisconnect_;
    std::unordered_map<int64_t, MessageCallback> onMessage_;
};

class QueueProcessor {
public:
    explicit QueueProcessor(DatabaseManager* db);
    ~QueueProcessor();

    void start();
    void stop();
    void enqueue(const std::string& taskType, const std::string& payload);
    bool isRunning() const { return running_; }

private:
    void processQueue();
    void processTask(const std::string& taskType, const std::string& payload);

    DatabaseManager* db_;
    std::thread workerThread_;
    std::mutex queueMutex_;
    std::condition_variable cv_;
    std::queue<std::pair<std::string, std::string>> taskQueue_;
    bool running_;
};

}