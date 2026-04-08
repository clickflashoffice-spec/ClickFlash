# master-cpp — Build Requirements

## Prerequisites

Install these before running cmake:

```
winget install Kitware.CMake
winget install Qt.QtCreator.6       # or Qt online installer → Qt 6.x MSVC2022 x64
winget install OpenCV               # or build from source with vcpkg
```

Or via vcpkg:
```
vcpkg install qt6 opencv4 spdlog nlohmann-json boost-filesystem
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake
```

## Build

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="C:/Qt/6.x.x/msvc2022_64"
cmake --build build --config Release
```

## Dependencies

| Library | Purpose |
|---------|---------|
| Qt6 (Core, Widgets, Gui, Network, Sql, PrintSupport, Xml, SerialPort) | UI + HTTP |
| OpenCV | Face detection / photo processing |
| spdlog | Structured logging |
| nlohmann_json | JSON parsing |
| Boost.Filesystem | Cross-platform paths |

## Status

CMake configure: blocked — Qt6 not installed on build machine  
Compiler: MSVC 19.50 (VS 2026) — available  
Migrations: 59 SQL files ported from master ✅
