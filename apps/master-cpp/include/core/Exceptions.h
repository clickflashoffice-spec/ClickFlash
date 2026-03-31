#pragma once

#include <stdexcept>
#include <QString>

namespace ClickFlash {

class ClickFlashException : public std::runtime_error {
public:
    ClickFlashException(const char* message) : std::runtime_error(message) {}
    ClickFlashException(const QString& message) : std::runtime_error(message.toStdString()) {}
};

class DatabaseException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class AuthenticationException : public ClickFlashException {
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

class ConflictException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class PaymentException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class KioskException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class SyncException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class ImageProcessingException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

class ConfigurationException : public ClickFlashException {
public:
    using ClickFlashException::ClickFlashException;
};

} // namespace ClickFlash
