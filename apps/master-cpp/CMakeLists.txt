cmake_minimum_required(VERSION 3.20)
project(ClickFlashMaster VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

if(MSVC)
    add_compile_options(/W4 /utf-8)
else()
    add_compile_options(-Wall -Wextra -pedantic)
endif()

find_package(Qt6 REQUIRED COMPONENTS 
    Core Widgets Gui Network Sql PrintSupport Xml SerialPort
)

find_package(OpenCV REQUIRED)
find_package(spdlog REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(Boost REQUIRED COMPONENTS filesystem)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${OpenCV_INCLUDE_DIRS}
    ${SPDLOG_INCLUDE_DIRS}
    ${NLOHMANN_JSON_INCLUDE_DIRS}
)

set(CORE_SOURCES
    src/core/Logger.cpp
    src/core/Config.cpp
    src/core/Exceptions.cpp
)

set(DATABASE_SOURCES
    src/database/DatabaseManager.cpp
    src/database/MigrationRunner.cpp
)

set(HTTP_SOURCES
    src/http/HttpServer.cpp
    src/http/Router.cpp
    src/http/Middleware.cpp
    src/http/Request.cpp
    src/http/Response.cpp
    src/http/Controller.cpp
    src/http/AuthController.cpp
    src/http/CollectionsController.cpp
    src/http/OrdersController.cpp
    src/http/SyncController.cpp
    src/http/SystemController.cpp
    src/http/FacesController.cpp
    src/http/CullingController.cpp
    src/http/PairingController.cpp
    src/http/FilesController.cpp
    src/http/RealtimeController.cpp
)

set(SERVICES_SOURCES
    src/services/AuthService.cpp
    src/services/CollectionService.cpp
    src/services/OrderService.cpp
    src/services/PhotoService.cpp
    src/services/SyncService.cpp
    src/services/FulfillmentService.cpp
    src/services/QueueProcessor.cpp
    src/services/RealtimeService.cpp
    src/services/LedgerService.cpp
)

set(WORKERS_SOURCES
    src/workers/WorkerPool.cpp
    src/workers/ThumbnailWorker.cpp
    src/workers/WatermarkWorker.cpp
    src/workers/FaceWorker.cpp
    src/workers/MLWorker.cpp
    src/workers/FolderWorker.cpp
)

set(UI_SOURCES
    src/ui/MainWindow.cpp
    src/ui/NavigationSidebar.cpp
    src/ui/View.cpp
    src/ui/Theme.cpp
    src/ui/dashboard/DashboardView.cpp
    src/ui/albums/AlbumsView.cpp
    src/ui/albums/AlbumEditor.cpp
    src/ui/albums/PhotoViewer.cpp
    src/ui/albums/Filmstrip.cpp
    src/ui/orders/OrdersView.cpp
    src/ui/orders/OrdersBoard.cpp
    src/ui/orders/OrderDetail.cpp
    src/ui/bookings/BookingsView.cpp
    src/ui/photographers/PhotographersView.cpp
    src/ui/clients/ClientsView.cpp
    src/ui/settings/SettingsView.cpp
    src/ui/settings/tabs/GeneralTab.cpp
    src/ui/settings/tabs/CloudTab.cpp
    src/ui/settings/tabs/KioskTab.cpp
    src/ui/settings/tabs/ProductsTab.cpp
    src/ui/settings/tabs/UsersTab.cpp
    src/ui/settings/tabs/DatabaseTab.cpp
    src/ui/settings/tabs/BackupTab.cpp
    src/ui/settings/tabs/PrintTab.cpp
    src/ui/settings/tabs/WatermarkTab.cpp
    src/ui/common/StatCard.cpp
    src/ui/common/PhotoGrid.cpp
    src/ui/common/Modal.cpp
    src/ui/common/Toast.cpp
    src/ui/common/Button.cpp
    src/ui/common/Input.cpp
    src/ui/common/Select.cpp
    src/ui/common/Table.cpp
    src/ui/common/Charts.cpp
    src/ui/common/VirtualScroll.cpp
)

set(UTILS_SOURCES
    src/utils/ImageProcessor.cpp
    src/utils/LanSigning.cpp
    src/utils/JwtHelper.cpp
    src/utils/PasswordHash.cpp
    src/utils/FileUtils.cpp
)

set(ALL_SOURCES
    src/main.cpp
    ${CORE_SOURCES}
    ${DATABASE_SOURCES}
    ${HTTP_SOURCES}
    ${SERVICES_SOURCES}
    ${WORKERS_SOURCES}
    ${UI_SOURCES}
    ${UTILS_SOURCES}
)

set(CORE_HEADERS
    include/core/Logger.h
    include/core/Config.h
    include/core/Exceptions.h
)

set(DATABASE_HEADERS
    include/database/DatabaseManager.h
    include/database/MigrationRunner.h
    include/database/Models.h
    include/database/QueryBuilder.h
)

set(HTTP_HEADERS
    include/http/HttpServer.h
    include/http/Router.h
    include/http/Middleware.h
    include/http/Request.h
    include/http/Response.h
    include/http/Controller.h
    include/http/AuthController.h
    include/http/CollectionsController.h
    include/http/OrdersController.h
    include/http/SyncController.h
    include/http/SystemController.h
    include/http/FacesController.h
    include/http/CullingController.h
    include/http/PairingController.h
    include/http/FilesController.h
    include/http/RealtimeController.h
)

set(SERVICES_HEADERS
    include/services/AuthService.h
    include/services/CollectionService.h
    include/services/OrderService.h
    include/services/PhotoService.h
    include/services/SyncService.h
    include/services/FulfillmentService.h
    include/services/QueueProcessor.h
    include/services/RealtimeService.h
    include/services/LedgerService.h
    include/services/VectorIndexService.h
    include/services/CloudSyncService.h
)

set(WORKERS_HEADERS
    include/workers/WorkerPool.h
    include/workers/ThumbnailWorker.h
    include/workers/WatermarkWorker.h
    include/workers/FaceWorker.h
    include/workers/MLWorker.h
    include/workers/FolderWorker.h
)

set(UI_HEADERS
    include/ui/MainWindow.h
    include/ui/NavigationSidebar.h
    include/ui/View.h
    include/ui/Theme.h
    include/ui/dashboard/DashboardView.h
    include/ui/albums/AlbumsView.h
    include/ui/albums/AlbumEditor.h
    include/ui/albums/PhotoViewer.h
    include/ui/albums/Filmstrip.h
    include/ui/orders/OrdersView.h
    include/ui/orders/OrdersBoard.h
    include/ui/orders/OrderDetail.h
    include/ui/bookings/BookingsView.h
    include/ui/photographers/PhotographersView.h
    include/ui/clients/ClientsView.h
    include/ui/settings/SettingsView.h
    include/ui/settings/tabs/GeneralTab.h
    include/ui/settings/tabs/CloudTab.h
    include/ui/settings/tabs/KioskTab.h
    include/ui/settings/tabs/ProductsTab.h
    include/ui/settings/tabs/UsersTab.h
    include/ui/settings/tabs/DatabaseTab.h
    include/ui/settings/tabs/BackupTab.h
    include/ui/settings/tabs/PrintTab.h
    include/ui/settings/tabs/WatermarkTab.h
    include/ui/common/StatCard.h
    include/ui/common/PhotoGrid.h
    include/ui/common/Modal.h
    include/ui/common/Toast.h
    include/ui/common/Button.h
    include/ui/common/Input.h
    include/ui/common/Select.h
    include/ui/common/Table.h
    include/ui/common/Charts.h
    include/ui/common/VirtualScroll.h
)

set(UTILS_HEADERS
    include/utils/ImageProcessor.h
    include/utils/LanSigning.h
    include/utils/JwtHelper.h
    include/utils/PasswordHash.h
    include/utils/FileUtils.h
)

set(ALL_HEADERS
    ${CORE_HEADERS}
    ${DATABASE_HEADERS}
    ${HTTP_HEADERS}
    ${SERVICES_HEADERS}
    ${WORKERS_HEADERS}
    ${UI_HEADERS}
    ${UTILS_HEADERS}
)

add_executable(${PROJECT_NAME} WIN32 ${ALL_SOURCES} ${ALL_HEADERS})

target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Core Qt6::Widgets Qt6::Gui Qt6::Network Qt6::Sql
    Qt6::PrintSupport Qt6::Xml Qt6::SerialPort
    ${OpenCV_LIBS}
    spdlog::spdlog
    nlohmann_json::nlohmann_json
    Boost::filesystem
)

target_compile_definitions(${PROJECT_NAME} PRIVATE
    SPDLOG_LEVEL=SPDLOG_LEVEL_DEBUG
    QT_NO_KEYWORDS
)

if(WIN32)
    set_target_properties(${PROJECT_NAME} PROPERTIES
        WIN32_EXECUTABLE TRUE
        OUTPUT_NAME "ClickFlashMaster"
    )
endif()

install(TARGETS ${PROJECT_NAME} DESTINATION bin)
