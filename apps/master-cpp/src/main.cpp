#include <iostream>
#include <memory>
#include <csignal>
#include <atomic>
#include <chrono>
#include <thread>

#include "core/Config.h"
#include "core/Logger.h"
#include "core/Exceptions.h"
#include "database/DatabaseManager.h"
#include "http/HttpServer.h"
#include "services/AuthService.h"
#include "services/CollectionService.h"
#include "services/OrderService.h"
#include "services/SyncService.h"
#include "services/RealtimeService.h"
#include "services/QueueProcessor.h"
#include "ui/MainWindow.h"

namespace ClickFlash {

class Application {
public:
    Application() 
        : config_(std::make_unique<Config>())
        , logger_(std::make_unique<Logger>())
        , db_(nullptr)
        , server_(nullptr)
        , mainWindow_(nullptr)
        , isRunning_(false) {}

    ~Application() {
        shutdown();
    }

    bool initialize() {
        try {
            logger_->info("Initializing ClickFlash Master application...");

            config_->load();
            
            logger_->setLevel(config_->getLogLevel());
            logger_->info("Configuration loaded successfully");

            db_ = std::make_unique<DatabaseManager>(config_->getDatabasePath());
            db_->initialize();
            logger_->info("Database initialized");

            authService_ = std::make_unique<AuthService>(db_.get());
            collectionService_ = std::make_unique<CollectionService>(db_.get());
            orderService_ = std::make_unique<OrderService>(db_.get());
            syncService_ = std::make_unique<SyncService>(db_.get(), config_.get());
            realtimeService_ = std::make_unique<RealtimeService>();
            queueProcessor_ = std::make_unique<QueueProcessor>(db_.get());

            server_ = std::make_unique<HttpServer>(
                config_->getPort(),
                db_.get(),
                authService_.get(),
                collectionService_.get(),
                orderService_.get(),
                syncService_.get(),
                realtimeService_.get()
            );

            if (!server_->start()) {
                throw InitException("Failed to start HTTP server on port " + 
                    std::to_string(config_->getPort()));
            }
            logger_->info("HTTP server started on port " + std::to_string(config_->getPort()));

            return true;
        } catch (const std::exception& e) {
            logger_->error("Initialization failed: " + std::string(e.what()));
            return false;
        }
    }

    void run() {
        isRunning_ = true;
        logger_->info("ClickFlash Master is running...");

        while (isRunning_) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }

    void shutdown() {
        if (!isRunning_) return;
        
        logger_->info("Shutting down ClickFlash Master...");
        isRunning_ = false;

        if (server_) {
            server_->stop();
            logger_->info("HTTP server stopped");
        }

        if (queueProcessor_) {
            queueProcessor_->stop();
        }

        db_.reset();
        logger_->info("Shutdown complete");
    }

    void handleSignal(int signal) {
        logger_->info("Received signal " + std::to_string(signal) + ", shutting down...");
        shutdown();
    }

private:
    std::unique_ptr<Config> config_;
    std::unique_ptr<Logger> logger_;
    std::unique_ptr<DatabaseManager> db_;
    std::unique_ptr<HttpServer> server_;
    std::unique_ptr<AuthService> authService_;
    std::unique_ptr<CollectionService> collectionService_;
    std::unique_ptr<OrderService> orderService_;
    std::unique_ptr<SyncService> syncService_;
    std::unique_ptr<RealtimeService> realtimeService_;
    std::unique_ptr<QueueProcessor> queueProcessor_;
    std::unique_ptr<MainWindow> mainWindow_;
    std::atomic<bool> isRunning_;
};

}

static ClickFlash::Application* g_app = nullptr;

void signalHandler(int signal) {
    if (g_app) {
        g_app->handleSignal(signal);
    }
}

int main(int argc, char* argv[]) {
    std::cout << "ClickFlash Master v4.3.0" << std::endl;
    std::cout << "==============================" << std::endl;

    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    auto app = std::make_unique<ClickFlash::Application>();
    g_app = app.get();

    if (!app->initialize()) {
        std::cerr << "Failed to initialize application" << std::endl;
        return 1;
    }

    app->run();
    app->shutdown();

    return 0;
}