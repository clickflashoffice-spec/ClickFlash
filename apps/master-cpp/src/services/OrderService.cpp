#include "services/OrderService.h"
#include "core/Config.h"
#include "database/DatabaseManager.h"
#include <sstream>
#include <random>
#include <iomanip>

namespace ClickFlash {

OrderService::OrderService(DatabaseManager* db) : db_(db) {}

int64_t OrderService::createOrder(int64_t albumId, const std::string& customerEmail,
                                   const std::string& customerName, const std::string& customerPhone) {
    std::string orderNumber = generateOrderNumber();
    
    std::ostringstream sql;
    sql << "INSERT INTO orders (order_number, album_id, customer_email, customer_name, customer_phone, status, payment_status, created_at) "
        << "VALUES ('" << orderNumber << "', " << albumId << ", '" << customerEmail << "', '" 
        << customerName << "', '" << customerPhone << "', 'pending', 'unpaid', datetime('now'))";
    
    db_->execute(sql.str());
    return db_->getLastInsertRowId();
}

bool OrderService::updateOrderStatus(int64_t orderId, const std::string& status) {
    std::ostringstream sql;
    sql << "UPDATE orders SET status = '" << status << "', updated_at = datetime('now') WHERE id = " << orderId;
    return db_->execute(sql.str());
}

bool OrderService::updatePaymentStatus(int64_t orderId, const std::string& paymentStatus,
                                        const std::string& paymentMethod, const std::string& stripePaymentId) {
    std::ostringstream sql;
    sql << "UPDATE orders SET payment_status = '" << paymentStatus << "', payment_method = '" 
        << paymentMethod << "', stripe_payment_id = '" << stripePaymentId << "', updated_at = datetime('now') WHERE id = " << orderId;
    return db_->execute(sql.str());
}

bool OrderService::deleteOrder(int64_t orderId) {
    db_->execute("DELETE FROM order_items WHERE order_id = " + std::to_string(orderId));
    return db_->execute("DELETE FROM orders WHERE id = " + std::to_string(orderId));
}

std::optional<OrderService::Order> OrderService::getOrder(int64_t orderId) {
    auto result = db_->queryMultiple("SELECT id, order_number, album_id, customer_id, total_amount, status, payment_status, payment_method, customer_email, customer_name, customer_phone, gallery_url, notes FROM orders WHERE id = " + std::to_string(orderId));
    if (result.empty()) return std::nullopt;
    
    Order order;
    order.id = std::stoll(result[0][0]);
    order.orderNumber = result[0][1];
    order.albumId = std::stoll(result[0][2]);
    order.customerId = std::stoll(result[0][3]);
    order.totalAmount = std::stod(result[0][4]);
    order.status = result[0][5];
    order.paymentStatus = result[0][6];
    order.paymentMethod = result[0][7];
    order.customerEmail = result[0][8];
    order.customerName = result[0][9];
    order.customerPhone = result[0][10];
    order.galleryUrl = result[0][11];
    order.notes = result[0][12];
    return order;
}

std::optional<OrderService::Order> OrderService::getOrderByNumber(const std::string& orderNumber) {
    auto result = db_->queryMultiple("SELECT id, order_number, album_id, customer_id, total_amount, status, payment_status, payment_method, customer_email, customer_name, customer_phone, gallery_url, notes FROM orders WHERE order_number = '" + orderNumber + "'");
    if (result.empty()) return std::nullopt;
    
    Order order;
    order.id = std::stoll(result[0][0]);
    order.orderNumber = result[0][1];
    order.albumId = std::stoll(result[0][2]);
    order.customerId = std::stoll(result[0][3]);
    order.totalAmount = std::stod(result[0][4]);
    order.status = result[0][5];
    order.paymentStatus = result[0][6];
    order.paymentMethod = result[0][7];
    order.customerEmail = result[0][8];
    order.customerName = result[0][9];
    order.customerPhone = result[0][10];
    order.galleryUrl = result[0][11];
    order.notes = result[0][12];
    return order;
}

std::vector<OrderService::Order> OrderService::getAllOrders() {
    auto result = db_->queryMultiple("SELECT id, order_number, album_id, customer_id, total_amount, status, payment_status, payment_method, customer_email, customer_name, customer_phone, gallery_url, notes FROM orders ORDER BY created_at DESC");
    std::vector<Order> orders;
    
    for (const auto& row : result) {
        Order order;
        order.id = std::stoll(row[0]);
        order.orderNumber = row[1];
        order.albumId = std::stoll(row[2]);
        order.customerId = std::stoll(row[3]);
        order.totalAmount = std::stod(row[4]);
        order.status = row[5];
        order.paymentStatus = row[6];
        order.paymentMethod = row[7];
        order.customerEmail = row[8];
        order.customerName = row[9];
        order.customerPhone = row[10];
        order.galleryUrl = row[11];
        order.notes = row[12];
        orders.push_back(order);
    }
    return orders;
}

std::vector<OrderService::Order> OrderService::getOrdersByAlbum(int64_t albumId) {
    auto result = db_->queryMultiple("SELECT id, order_number, album_id, customer_id, total_amount, status, payment_status, payment_method, customer_email, customer_name, customer_phone, gallery_url, notes FROM orders WHERE album_id = " + std::to_string(albumId));
    std::vector<Order> orders;
    
    for (const auto& row : result) {
        Order order;
        order.id = std::stoll(row[0]);
        order.orderNumber = row[1];
        order.albumId = std::stoll(row[2]);
        order.customerId = std::stoll(row[3]);
        order.totalAmount = std::stod(row[4]);
        order.status = row[5];
        order.paymentStatus = row[6];
        order.paymentMethod = row[7];
        order.customerEmail = row[8];
        order.customerName = row[9];
        order.customerPhone = row[10];
        order.galleryUrl = row[11];
        order.notes = row[12];
        orders.push_back(order);
    }
    return orders;
}

std::vector<OrderService::Order> OrderService::getOrdersByCustomer(const std::string& email) {
    auto result = db_->queryMultiple("SELECT id, order_number, album_id, customer_id, total_amount, status, payment_status, payment_method, customer_email, customer_name, customer_phone, gallery_url, notes FROM orders WHERE customer_email = '" + email + "'");
    std::vector<Order> orders;
    
    for (const auto& row : result) {
        Order order;
        order.id = std::stoll(row[0]);
        order.orderNumber = row[1];
        order.albumId = std::stoll(row[2]);
        order.customerId = std::stoll(row[3]);
        order.totalAmount = std::stod(row[4]);
        order.status = row[5];
        order.paymentStatus = row[6];
        order.paymentMethod = row[7];
        order.customerEmail = row[8];
        order.customerName = row[9];
        order.customerPhone = row[10];
        order.galleryUrl = row[11];
        order.notes = row[12];
        orders.push_back(order);
    }
    return orders;
}

std::vector<OrderService::Order> OrderService::getOrdersByStatus(const std::string& status) {
    auto result = db_->queryMultiple("SELECT id, order_number, album_id, customer_id, total_amount, status, payment_status, payment_method, customer_email, customer_name, customer_phone, gallery_url, notes FROM orders WHERE status = '" + status + "'");
    std::vector<Order> orders;
    
    for (const auto& row : result) {
        Order order;
        order.id = std::stoll(row[0]);
        order.orderNumber = row[1];
        order.albumId = std::stoll(row[2]);
        order.customerId = std::stoll(row[3]);
        order.totalAmount = std::stod(row[4]);
        order.status = row[5];
        order.paymentStatus = row[6];
        order.paymentMethod = row[7];
        order.customerEmail = row[8];
        order.customerName = row[9];
        order.customerPhone = row[10];
        order.galleryUrl = row[11];
        order.notes = row[12];
        orders.push_back(order);
    }
    return orders;
}

bool OrderService::addOrderItem(int64_t orderId, const std::string& productType,
                                int quantity, double unitPrice, const std::string& metadata) {
    double totalPrice = quantity * unitPrice;
    std::ostringstream sql;
    sql << "INSERT INTO order_items (order_id, product_type, quantity, unit_price, total_price, metadata) "
        << "VALUES (" << orderId << ", '" << productType << "', " << quantity << ", " 
        << unitPrice << ", " << totalPrice << ", '" << metadata << "')";
    return db_->execute(sql.str());
}

std::vector<OrderService::OrderItem> OrderService::getOrderItems(int64_t orderId) {
    auto result = db_->queryMultiple("SELECT id, order_id, product_type, quantity, unit_price, total_price, metadata FROM order_items WHERE order_id = " + std::to_string(orderId));
    std::vector<OrderItem> items;
    
    for (const auto& row : result) {
        OrderItem item;
        item.id = std::stoll(row[0]);
        item.orderId = std::stoll(row[1]);
        item.productType = row[2];
        item.quantity = std::stoi(row[3]);
        item.unitPrice = std::stod(row[4]);
        item.totalPrice = std::stod(row[5]);
        item.metadata = row[6];
        items.push_back(item);
    }
    return items;
}

std::string OrderService::generateOrderNumber() {
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::tm tm = {};
    localtime_s(&tm, &time);
    
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y%m%d");
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(1000, 9999);
    oss << "-" << dis(gen);
    
    return oss.str();
}

SyncService::SyncService(DatabaseManager* db, Config* config) : db_(db), config_(config) {}

void SyncService::recordChange(const std::string& tableName, int64_t recordId,
                                const std::string& operation, const std::string& data) {
    std::ostringstream sql;
    sql << "INSERT INTO sync_records (table_name, record_id, operation, data, synced, created_at) "
        << "VALUES ('" << tableName << "', " << recordId << ", '" << operation << "', '" 
        << data << "', 0, datetime('now'))";
    db_->execute(sql.str());
}

std::vector<SyncService::SyncRecord> SyncService::getUnsyncedChanges() {
    auto result = db_->queryMultiple("SELECT id, table_name, record_id, operation, data, synced FROM sync_records WHERE synced = 0");
    std::vector<SyncRecord> records;
    
    for (const auto& row : result) {
        SyncRecord record;
        record.id = std::stoll(row[0]);
        record.tableName = row[1];
        record.recordId = std::stoll(row[2]);
        record.operation = row[3];
        record.data = row[4];
        record.synced = row[5] == "1";
        records.push_back(record);
    }
    return records;
}

bool SyncService::markAsSynced(int64_t recordId) {
    std::ostringstream sql;
    sql << "UPDATE sync_records SET synced = 1, synced_at = datetime('now') WHERE id = " << recordId;
    return db_->execute(sql.str());
}

bool SyncService::syncToCloud() {
    return true;
}

bool SyncService::syncFromCloud() {
    return true;
}

RealtimeService::RealtimeService() : nextConnectionId_(1) {}

int64_t RealtimeService::addConnection(ConnectionCallback onConnect, ConnectionCallback onDisconnect,
                                       MessageCallback onMessage) {
    int64_t id = nextConnectionId_++;
    onConnect_[id] = onConnect;
    onDisconnect_[id] = onDisconnect;
    onMessage_[id] = onMessage;
    return id;
}

void RealtimeService::removeConnection(int64_t connectionId) {
    onConnect_.erase(connectionId);
    onDisconnect_.erase(connectionId);
    onMessage_.erase(connectionId);
}

void RealtimeService::broadcast(const std::string& message) {
    for (const auto& [id, callback] : onMessage_) {
        callback(id, message);
    }
}

void RealtimeService::sendTo(int64_t connectionId, const std::string& message) {
    auto it = onMessage_.find(connectionId);
    if (it != onMessage_.end()) {
        it->second(connectionId, message);
    }
}

QueueProcessor::QueueProcessor(DatabaseManager* db) : db_(db), running_(false) {}

QueueProcessor::~QueueProcessor() {
    stop();
}

void QueueProcessor::start() {
    running_ = true;
    workerThread_ = std::thread([this]() { processQueue(); });
}

void QueueProcessor::stop() {
    running_ = false;
    cv_.notify_all();
    if (workerThread_.joinable()) {
        workerThread_.join();
    }
}

void QueueProcessor::enqueue(const std::string& taskType, const std::string& payload) {
    std::lock_guard<std::mutex> lock(queueMutex_);
    taskQueue_.push({taskType, payload});
    cv_.notify_one();
}

void QueueProcessor::processQueue() {
    while (running_) {
        std::unique_lock<std::mutex> lock(queueMutex_);
        cv_.wait(lock, [this] { return !taskQueue_.empty() || !running_; });
        
        if (!running_) break;
        
        auto task = taskQueue_.front();
        taskQueue_.pop();
        lock.unlock();
        
        processTask(task.first, task.second);
    }
}

void QueueProcessor::processTask(const std::string& taskType, const std::string& payload) {
    std::cout << "Processing task: " << taskType << std::endl;
}

}