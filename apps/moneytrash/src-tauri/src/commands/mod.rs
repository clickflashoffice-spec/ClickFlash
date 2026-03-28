//! Tauri command modules
//!
//! This module organizes all Tauri commands into logical groups:
//! - file: File system operations
//! - upload: Upload operations with progress tracking
//! - config: Configuration and history management
//! - notification: System notifications

pub mod config;
pub mod file;
pub mod notification;
pub mod upload;
