//! Error types for MoneyTrash Uploader
//! 
//! This module defines all error types used across the application,
//! providing structured error handling for the Rust/JS boundary.

use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

/// Result type alias using AppError
pub type AppResult<T> = Result<T, AppError>;

/// Main application error type
#[derive(Error, Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(String),
    
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    #[error("Upload error: {0}")]
    Upload(String),
    
    #[error("Configuration error: {0}")]
    Config(String),
    
    #[error("Session error: {0}")]
    Session(String),
    
    #[error("Chunk error: {0}")]
    Chunk(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Directory not found: {0}")]
    DirectoryNotFound(String),
    
    #[error("File too large: {0}")]
    FileTooLarge(String),
    
    #[error("Invalid file type: {0}")]
    InvalidFileType(String),
    
    #[error("API error: {0}")]
    Api(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl AppError {
    /// Get the error code for programmatic handling
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Io(_) => "IO_ERROR",
            AppError::Network(_) => "NETWORK_ERROR",
            AppError::FileNotFound(_) => "FILE_NOT_FOUND",
            AppError::InvalidPath(_) => "INVALID_PATH",
            AppError::Serialization(_) => "SERIALIZATION_ERROR",
            AppError::Upload(_) => "UPLOAD_ERROR",
            AppError::Config(_) => "CONFIG_ERROR",
            AppError::Session(_) => "SESSION_ERROR",
            AppError::Chunk(_) => "CHUNK_ERROR",
            AppError::PermissionDenied(_) => "PERMISSION_DENIED",
            AppError::DirectoryNotFound(_) => "DIRECTORY_NOT_FOUND",
            AppError::FileTooLarge(_) => "FILE_TOO_LARGE",
            AppError::InvalidFileType(_) => "INVALID_FILE_TYPE",
            AppError::Api(_) => "API_ERROR",
            AppError::Unknown(_) => "UNKNOWN_ERROR",
        }
    }
    
    /// Check if the error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            AppError::Network(_) | 
            AppError::Upload(_) | 
            AppError::Api(_) |
            AppError::Io(_)
        )
    }
    
    /// Get a user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            AppError::Io(msg) => format!("A file system error occurred: {}", msg),
            AppError::Network(msg) => format!("Network connection issue: {}. Please check your connection and try again.", msg),
            AppError::FileNotFound(path) => format!("File not found: {}", path),
            AppError::InvalidPath(path) => format!("Invalid file path: {}", path),
            AppError::Serialization(msg) => format!("Data processing error: {}", msg),
            AppError::Upload(msg) => format!("Upload failed: {}", msg),
            AppError::Config(msg) => format!("Configuration error: {}", msg),
            AppError::Session(msg) => format!("Upload session error: {}", msg),
            AppError::Chunk(msg) => format!("File chunk error: {}", msg),
            AppError::PermissionDenied(path) => format!("Permission denied accessing: {}", path),
            AppError::DirectoryNotFound(path) => format!("Directory not found: {}", path),
            AppError::FileTooLarge(name) => format!("File is too large: {}", name),
            AppError::InvalidFileType(ext) => format!("Unsupported file type: {}", ext),
            AppError::Api(msg) => format!("Server error: {}", msg),
            AppError::Unknown(msg) => format!("An unexpected error occurred: {}", msg),
        }
    }
}

/// Convert from std::io::Error
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => AppError::FileNotFound(err.to_string()),
            std::io::ErrorKind::PermissionDenied => AppError::PermissionDenied(err.to_string()),
            _ => AppError::Io(err.to_string()),
        }
    }
}

/// Convert from serde_json::Error
impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err.to_string())
    }
}

/// Convert from reqwest::Error
impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            AppError::Network("Request timed out".to_string())
        } else if err.is_connect() {
            AppError::Network("Failed to connect to server".to_string())
        } else {
            AppError::Network(err.to_string())
        }
    }
}

/// Convert from tauri::Error
impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self {
        AppError::Unknown(err.to_string())
    }
}

/// Response structure for command results
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum CommandResult<T> {
    Success { data: T },
    Error { error: AppError, code: String },
}

impl<T> CommandResult<T> {
    /// Create a success result
    pub fn success(data: T) -> Self {
        CommandResult::Success { data }
    }
    
    /// Create an error result
    pub fn error(error: AppError) -> Self {
        let code = error.code().to_string();
        CommandResult::Error { error, code }
    }
}

/// Error context for better error reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorContext {
    pub operation: String,
    pub file_path: Option<String>,
    pub additional_info: Option<String>,
}

impl ErrorContext {
    pub fn new(operation: impl Into<String>) -> Self {
        Self {
            operation: operation.into(),
            file_path: None,
            additional_info: None,
        }
    }
    
    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.file_path = Some(path.into());
        self
    }
    
    pub fn with_info(mut self, info: impl Into<String>) -> Self {
        self.additional_info = Some(info.into());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_code() {
        let err = AppError::Network("timeout".to_string());
        assert_eq!(err.code(), "NETWORK_ERROR");
        
        let err = AppError::FileNotFound("test.txt".to_string());
        assert_eq!(err.code(), "FILE_NOT_FOUND");
    }
    
    #[test]
    fn test_is_retryable() {
        assert!(AppError::Network("timeout".to_string()).is_retryable());
        assert!(AppError::Upload("failed".to_string()).is_retryable());
        assert!(!AppError::FileNotFound("test.txt".to_string()).is_retryable());
        assert!(!AppError::InvalidFileType("exe".to_string()).is_retryable());
    }
    
    #[test]
    fn test_from_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let app_err: AppError = io_err.into();
        assert!(matches!(app_err, AppError::FileNotFound(_)));
    }
    
    #[test]
    fn test_command_result_success() {
        let result: CommandResult<i32> = CommandResult::success(42);
        match result {
            CommandResult::Success { data } => assert_eq!(data, 42),
            _ => panic!("Expected success"),
        }
    }
    
    #[test]
    fn test_command_result_error() {
        let err = AppError::Upload("failed".to_string());
        let result: CommandResult<()> = CommandResult::error(err.clone());
        match result {
            CommandResult::Error { error, code } => {
                assert_eq!(code, "UPLOAD_ERROR");
                assert_eq!(error.code(), "UPLOAD_ERROR");
            }
            _ => panic!("Expected error"),
        }
    }
}
