#pragma once

#include <string>
#include <exception>

namespace ClickFlash {

class ClickFlashException : public std::exception {
public:
    explicit ClickFlashException(const std::string& message) 
        : message_(message) {}
    
    const char* what() const noexcept override {
        return message_.c_str();
    }

protected:
    std::string message_;
};

class InitException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class DatabaseException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class AuthException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class ValidationException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class NotFoundException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class PermissionException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

}