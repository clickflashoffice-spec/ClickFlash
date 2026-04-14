cmake_minimum_required(VERSION 3.20)
project(ClickFlashMaster VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

if(MSVC)
    add_compile_options(/W4 /utf-8 /permissive-)
else()
    add_compile_options(-Wall -Wextra -pedantic)
endif()

# Qt6 (must find before FetchContent)
set(Qt6_DIR "" CACHE PATH "Path to Qt6 installation")
find_package(Qt6 REQUIRED COMPONENTS
    Core Widgets Gui Network Sql PrintSupport Xml SerialPort
)

# WebSockets (optional)
find_package(Qt6 QUIET COMPONENTS WebSockets)
set(USE_WEBSOCKETS ${Qt6WebSockets_FOUND})

# OpenCV (optional)
find_package(OpenCV QUIET)
set(USE_OPENCV ${OpenCV_FOUND})

# Boost (optional)
find_package(Boost QUIET COMPONENTS filesystem system)
set(USE_BOOST ${Boost_FOUND})

# FetchContent for header-only libs AFTER Qt6
include(FetchContent)

# spdlog (header-only)
FetchContent_Declare(
    spdlog
    GIT_REPOSITORY https://github.com/gabime/spdlog.git
    GIT_TAG v1.12.0
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(spdlog)

# nlohmann_json (header-only)
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(nlohmann_json)

# Include directories for source files
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Source files
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

if(USE_OPENCV)
    list(APPEND SERVICES_SOURCES src/services/VectorIndexService.cpp)
endif()

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
    src/ui/fulfillment/FulfillmentView.cpp
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

add_executable(${PROJECT_NAME} WIN32 ${ALL_SOURCES})

# Link Qt6
target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Core Qt6::Widgets Qt6::Gui Qt6::Network Qt6::Sql
    Qt6::PrintSupport Qt6::Xml Qt6::SerialPort
)

# Link spdlog
target_link_libraries(${PROJECT_NAME} PRIVATE spdlog::spdlog)

# Link nlohmann_json
target_link_libraries(${PROJECT_NAME} PRIVATE nlohmann_json::nlohmann_json)

if(Qt6WebSockets_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE Qt6::WebSockets)
endif()

if(Boost_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE Boost::filesystem Boost::system)
endif()

if(OpenCV_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE ${OpenCV_LIBS})
endif()

# Compile definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE
    SPDLOG_LEVEL=SPDLOG_LEVEL_DEBUG
    QT_NO_KEYWORDS
    USE_OPENCV=$<BOOL:${USE_OPENCV}>
    USE_WEBSOCKETS=$<BOOL:${USE_WEBSOCKETS}>
    USE_BOOST=$<BOOL:${USE_BOOST}>
)

if(WIN32)
    set_target_properties(${PROJECT_NAME} PROPERTIES
        WIN32_EXECUTABLE TRUE
        OUTPUT_NAME "ClickFlashMaster"
    )
endif()

# Add include directories for FetchContent deps
target_include_directories(${PROJECT_NAME} PRIVATE
    ${spdlog_SOURCE_DIR}/include
    ${nlohmann_json_SOURCE_DIR}/include
)

install(TARGETS ${PROJECT_NAME} DESTINATION bin)

message(STATUS "")
message(STATUS "=== ClickFlash Master C++ Build Configuration ===")
message(STATUS "Qt6: FOUND")
message(STATUS "Qt6WebSockets: ${USE_WEBSOCKETS}")
message(STATUS "OpenCV: ${USE_OPENCV}")
message(STATUS "spdlog: FETCHCONTENT")
message(STATUS "nlohmann_json: FETCHCONTENT")
message(STATUS "Boost: ${USE_BOOST}")
message(STATUS "=============================================")
message(STATUS "")