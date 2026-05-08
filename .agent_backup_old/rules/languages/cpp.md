# C++ Standards

## 1. Modern C++ (C++17/20)

* **Smart Pointers**: `std::unique_ptr` and `std::shared_ptr` ONLY. No `new`/`delete`.
* **Auto**: Use `auto` for complex iterator types, but explicit types for primitives.

## 2. Build System

* **CMake**: Use Modern CMake (Target-based, not Variable-based).
* **Vcpkg/Conan**: Use package managers for dependencies.

## 3. Safety

* **RAII**: Resource Acquisition Is Initialization. Manage all resources in classes.
* **Const correctness**: Mark methods/variables `const` wherever possible.
