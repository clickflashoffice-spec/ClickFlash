#pragma once

#include <string>
#include <memory>
#include <functional>
#include <unordered_map>
#include <vector>

#include "services/AuthService.h"
#include "services/CollectionService.h"
#include "services/OrderService.h"
#include "services/SyncService.h"
#include "services/RealtimeService.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class HttpServer {
public:
    HttpServer(int port, DatabaseManager* db, AuthService* auth,
               CollectionService* collection, OrderService* order,
               SyncService* sync, RealtimeService* realtime);
    ~HttpServer();

    bool start();
    void stop();
    bool isRunning() const { return running_; }

    using RequestHandler = std::function<std::string(const std::string& body)>;

    void registerRoute(const std::string& method, const std::string& path, RequestHandler handler);
    void registerMiddleware(RequestHandler middleware);

private:
    void handleRequest(const std::string& method, const std::string& path, 
                      const std::string& body, std::string& response);
    std::string handleAuth(const std::string& body);
    std::string handleCollections(const std::string& body);
    std::string handleOrders(const std::string& body);
    std::string handleSync(const std::string& body);
    std::string handleFiles(const std::string& body);
    std::string handleSystem(const std::string& body);

    int port_;
    bool running_;
    std::thread serverThread_;

    DatabaseManager* db_;
    AuthService* auth_;
    CollectionService* collection_;
    OrderService* order_;
    SyncService* sync_;
    RealtimeService* realtime_;

    std::unordered_map<std::string, std::unordered_map<std::string, RequestHandler>> routes_;
    std::vector<RequestHandler> middlewares_;
};

}