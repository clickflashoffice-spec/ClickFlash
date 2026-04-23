#include <QApplication>
#include <QDebug>
#include <QMessageBox>
#include <QStyleFactory>

#include "core/Logger.h"
#include "core/Config.h"
#include "database/DatabaseManager.h"
#include "http/HttpServer.h"
#include "ui/MainWindow.h"

using namespace ClickFlash;

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    app.setApplicationName("ClickFlash Master");
    app.setApplicationVersion("1.0.0");
    app.setOrganizationName("ClickFlash");
    app.setStyle(QStyleFactory::create("Fusion"));
    
    Logger::instance().init();
    Logger::info("ClickFlash Master starting...");
    
    try {
        Config& config = Config::instance();
        config.load();
        
        DatabaseManager& db = DatabaseManager::instance();
        db.initialize();
        
        HttpServer server;
        server.start(config.getPort());
        
        MainWindow window;
        window.show();
        
        int result = app.exec();
        
        server.stop();
        Logger::info("ClickFlash Master shutting down...");
        
        return result;
        
    } catch (const std::exception& e) {
        Logger::critical("Fatal error: {}", e.what());
        QMessageBox::critical(nullptr, "Fatal Error", 
            QString("Failed to start ClickFlash Master:\n%1").arg(e.what()));
        return 1;
    }
}
