//! MoneyTrash Uploader Library
//!
//! This crate provides the Rust backend for the MoneyTrash Uploader
//! Tauri application. It handles file operations, upload management,
//! and system integration.

pub mod checksum;
pub mod commands;
pub mod errors;
pub mod state;

// Re-export commonly used types
pub use errors::{AppError, AppResult, CommandResult};
pub use state::{UploadState, UploadStats, AppConfig};
