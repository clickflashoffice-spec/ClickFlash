cmake_minimum_required(VERSION 3.20)

project(ClickFlashMaster VERSION 4.3.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(BUILD_TESTS "Build tests" OFF)
option(BUILD_SHARED_LIBS "Build shared libraries" OFF)

if(MSVC)
    add_compile_options(/W4 /WX- /permissive-)
    add_compile_options(/utf-8)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

find_library(SQLITE3_LIBRARY sqlite3)
if(NOT SQLITE3_LIBRARY)
    message(FATAL_ERROR "SQLite3 not found")
endif()

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/include/core
    ${CMAKE_CURRENT_SOURCE_DIR}/include/database
    ${CMAKE_CURRENT_SOURCE_DIR}/include/http
    ${CMAKE_CURRENT_SOURCE_DIR}/include/services
    ${CMAKE_CURRENT_SOURCE_DIR}/include/ui
    ${CMAKE_CURRENT_SOURCE_DIR}/include/ui/fulfillment
    ${CMAKE_CURRENT_SOURCE_DIR}/include/utils
    ${CMAKE_CURRENT_SOURCE_DIR}/include/workers
)

set(SOURCES
    src/main.cpp
    src/core/Config.cpp
    src/core/Logger.cpp
    src/core/Exceptions.cpp
    src/database/DatabaseManager.cpp
    src/database/MigrationRunner.cpp
    src/http/Controller.cpp
    src/http/Response.cpp
    src/http/HttpServer.cpp
    src/services/AuthService.cpp
    src/services/CollectionService.cpp
    src/services/OrderService.cpp
    src/services/SyncService.cpp
    src/services/RealtimeService.cpp
    src/services/QueueProcessor.cpp
    src/services/FulfillmentService.cpp
    src/ui/Theme.cpp
    src/ui/MainWindow.cpp
    src/ui/NavigationSidebar.cpp
    src/ui/View.cpp
    src/ui/albums/AlbumsView.cpp
    src/ui/albums/PhotoViewer.cpp
    src/ui/bookings/BookingsView.cpp
    src/ui/common/Input.cpp
    src/ui/common/Modal.cpp
    src/ui/common/PhotoGrid.cpp
    src/ui/common/StatCard.cpp
    src/ui/common/Table.cpp
    src/ui/common/Toast.cpp
    src/ui/dashboard/DashboardView.cpp
    src/ui/orders/OrdersView.cpp
    src/ui/photographers/PhotographersView.cpp
    src/ui/settings/SettingsView.cpp
    src/ui/fulfillment/FulfillmentView.cpp
    src/utils/ImageProcessor.cpp
    src/utils/JwtHelper.cpp
    src/utils/LanSigning.cpp
    src/utils/PasswordHash.cpp
    src/workers/FaceWorker.cpp
    src/workers/FolderWorker.cpp
    src/workers/MLWorker.cpp
    src/workers/ThumbnailWorker.cpp
    src/workers/WatermarkWorker.cpp
    src/workers/WorkerPool.cpp
)

add_executable(ClickFlashMaster ${SOURCES})

target_link_libraries(ClickFlashMaster
    Threads::Threads
    OpenSSL::SSL
    OpenSSL::Crypto
    ${SQLITE3_LIBRARY}
)

if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

message(STATUS "ClickFlash Master ${PROJECT_VERSION}")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")