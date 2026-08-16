cmake_minimum_required(VERSION 3.20)
project(clickflash-master-cpp VERSION 6.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Options
option(BUILD_TESTS "Build tests" ON)
option(ENABLE_SQLCIPHER "Enable SQLCipher encryption" ON)
option(ENABLE_OPENSSL "Enable OpenSSL for HTTPS" ON)

# ---------------------------------------------------------------------------
# Dependencies (all from vcpkg – NO Qt required)
# ---------------------------------------------------------------------------
find_package(Drogon CONFIG REQUIRED)
find_package(SQLite3 REQUIRED)
find_package(SQLiteCpp CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(Threads REQUIRED)
find_package(OpenCV REQUIRED)
find_package(redis-plus-plus CONFIG REQUIRED)

if(ENABLE_OPENSSL)
    find_package(OpenSSL REQUIRED)
endif()

if(ENABLE_SQLCIPHER)
    find_package(SQLCipher QUIET)
    if(NOT SQLCipher_FOUND)
        message(STATUS "SQLCipher not found as separate package, using SQLite3 with PRAGMA key")
    endif()
endif()

# ---------------------------------------------------------------------------
# Include directories
# ---------------------------------------------------------------------------
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/include/core
    ${CMAKE_SOURCE_DIR}/include/db
    ${CMAKE_SOURCE_DIR}/include/http
    ${CMAKE_SOURCE_DIR}/include/services
    ${CMAKE_SOURCE_DIR}/include/utils
    ${CMAKE_SOURCE_DIR}/include/workers
)

# ---------------------------------------------------------------------------
# Source files
# ---------------------------------------------------------------------------
file(GLOB_RECURSE SOURCES
    "src/*.cpp"
    "src/core/*.cpp"
    "src/db/*.cpp"
    "src/http/*.cpp"
    "src/services/*.cpp"
    "src/utils/*.cpp"
    "src/workers/*.cpp"
)

# ---------------------------------------------------------------------------
# Main executable (headless HTTP service via Drogon)
# ---------------------------------------------------------------------------
add_executable(${PROJECT_NAME} ${SOURCES})

target_link_libraries(${PROJECT_NAME} PRIVATE
    Drogon::Drogon
    SQLite::SQLite3
    SQLiteCpp
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    Threads::Threads
    redis-plus-plus::redis-plus-plus
    ${OpenCV_LIBS}
)

if(ENABLE_OPENSSL AND OpenSSL_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE OpenSSL::SSL OpenSSL::Crypto)
    target_compile_definitions(${PROJECT_NAME} PRIVATE ENABLE_OPENSSL)
endif()

if(ENABLE_SQLCIPHER)
    target_compile_definitions(${PROJECT_NAME} PRIVATE ENABLE_SQLCIPHER)
endif()

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

# ---------------------------------------------------------------------------
# Configuration summary
# ---------------------------------------------------------------------------
message(STATUS "")
message(STATUS "ClickFlash Master C++ Configuration:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build Tests: ${BUILD_TESTS}")
message(STATUS "  SQLCipher: ${ENABLE_SQLCIPHER}")
message(STATUS "  OpenSSL: ${ENABLE_OPENSSL}")
message(STATUS "  Drogon: ${Drogon_VERSION}")
message(STATUS "  SQLite3: ${SQLite3_VERSION}")
message(STATUS "")
