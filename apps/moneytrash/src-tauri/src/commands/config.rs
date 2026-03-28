//! Configuration and history management commands
//!
//! Handles saving/loading of user configuration and upload history
//! with proper error handling and data validation.

use crate::errors::{AppError, AppResult, CommandResult};
use serde::{Deserialize, Serialize};

/// Upload configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadConfig {
    #[serde(rename = "eventName")]
    pub event_name: String,
    #[serde(rename = "accessCode")]
    pub access_code: String,
    pub mode: String,
    #[serde(rename = "customerEmail")]
    pub customer_email: Option<String>,
    #[serde(rename = "singlePhotoPrice")]
    pub single_photo_price: Option<String>,
    #[serde(rename = "fullGalleryPrice")]
    pub full_gallery_price: Option<String>,
    #[serde(rename = "apiUrl")]
    pub api_url: Option<String>,
    #[serde(rename = "deskId")]
    pub desk_id: Option<String>,
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    #[serde(rename = "s3AccessKey")]
    pub s3_access_key: Option<String>,
    #[serde(rename = "s3SecretKey")]
    pub s3_secret_key: Option<String>,
    #[serde(rename = "s3Region")]
    pub s3_region: Option<String>,
    #[serde(rename = "s3Bucket")]
    pub s3_bucket: Option<String>,
    #[serde(rename = "s3Endpoint")]
    pub s3_endpoint: Option<String>,
}

/// Upload history item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadHistoryItem {
    pub id: String,
    #[serde(rename = "eventName")]
    pub event_name: String,
    #[serde(rename = "accessCode")]
    pub access_code: String,
    #[serde(rename = "fileCount")]
    pub file_count: u32,
    pub timestamp: String,
    pub mode: String,
}

/// Get the config file path
fn get_config_path() -> AppResult<std::path::PathBuf> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| AppError::Config("Could not find config directory".to_string()))?;
    
    Ok(config_dir.join("moneytrash-uploader").join("config.json"))
}

/// Get the history file path
fn get_history_path() -> AppResult<std::path::PathBuf> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| AppError::Config("Could not find data directory".to_string()))?;
    
    Ok(data_dir.join("moneytrash-uploader").join("upload_history.json"))
}

/// Ensure the config directory exists
async fn ensure_config_dir() -> AppResult<()> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| AppError::Config("Could not find config directory".to_string()))?
        .join("moneytrash-uploader");
    
    tokio::fs::create_dir_all(&config_dir).await
        .map_err(|e| AppError::Io(format!("Failed to create config directory: {}", e)))?;
    
    Ok(())
}

/// Ensure the data directory exists
async fn ensure_data_dir() -> AppResult<()> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| AppError::Config("Could not find data directory".to_string()))?
        .join("moneytrash-uploader");
    
    tokio::fs::create_dir_all(&data_dir).await
        .map_err(|e| AppError::Io(format!("Failed to create data directory: {}", e)))?;
    
    Ok(())
}

/// Save upload configuration
#[tauri::command]
pub async fn save_upload_config(config: UploadConfig) -> CommandResult<()> {
    match internal_save_config(&config).await {
        Ok(_) => CommandResult::success(()),
        Err(e) => {
            log::error!("Save config error: {:?}", e);
            CommandResult::error(e)
        }
    }
}

async fn internal_save_config(config: &UploadConfig) -> AppResult<()> {
    ensure_config_dir().await?;
    
    let config_path = get_config_path()?;
    let config_json = serde_json::to_string_pretty(config)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    tokio::fs::write(&config_path, config_json).await
        .map_err(|e| AppError::Io(format!("Failed to write config: {}", e)))?;
    
    log::info!("Configuration saved successfully");
    Ok(())
}

/// Load upload configuration
#[tauri::command]
pub async fn load_upload_config() -> CommandResult<Option<UploadConfig>> {
    match internal_load_config().await {
        Ok(config) => CommandResult::success(config),
        Err(e) => {
            log::error!("Load config error: {:?}", e);
            CommandResult::error(e)
        }
    }
}

async fn internal_load_config() -> AppResult<Option<UploadConfig>> {
    let config_path = get_config_path()?;
    
    if !config_path.exists() {
        // Fallback to environment variables if config file doesn't exist
        // This allows "pre-configuration" via .env or system environment
        let api_url = std::env::var("CLOUD_API_URL").ok();
        let desk_id = std::env::var("NEXT_PUBLIC_SITE_ID").ok()
            .or_else(|| std::env::var("DESK_ID").ok());
            
        if api_url.is_some() || desk_id.is_some() {
            log::info!("No config file found, falling back to environment variables");
            return Ok(Some(UploadConfig {
                event_name: "".to_string(),
                access_code: "".to_string(),
                mode: "moneytrash".to_string(),
                customer_email: None,
                single_photo_price: std::env::var("DEFAULT_SINGLE_PHOTO_PRICE").ok(),
                full_gallery_price: std::env::var("DEFAULT_FULL_GALLERY_PRICE").ok(),
                api_url,
                desk_id,
                api_key: std::env::var("CLOUD_API_KEY").ok(),
                s3_access_key: std::env::var("R2_ACCESS_KEY_ID").ok(),
                s3_secret_key: std::env::var("R2_SECRET_ACCESS_KEY").ok(),
                s3_region: Some("auto".to_string()),
                s3_bucket: std::env::var("R2_BUCKET").ok(),
                s3_endpoint: std::env::var("R2_ENDPOINT").ok(),
            }));
        }
        return Ok(None);
    }
    
    let config_json = tokio::fs::read_to_string(&config_path).await
        .map_err(|e| AppError::Io(format!("Failed to read config: {}", e)))?;
    
    let config: UploadConfig = serde_json::from_str(&config_json)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    log::info!("Configuration loaded from file successfully");
    Ok(Some(config))
}

/// Save upload history
#[tauri::command]
pub async fn save_upload_history(history: Vec<UploadHistoryItem>) -> CommandResult<()> {
    match internal_save_history(&history).await {
        Ok(_) => CommandResult::success(()),
        Err(e) => {
            log::error!("Save history error: {:?}", e);
            CommandResult::error(e)
        }
    }
}

async fn internal_save_history(history: &[UploadHistoryItem]) -> AppResult<()> {
    ensure_data_dir().await?;
    
    let history_path = get_history_path()?;
    let history_json = serde_json::to_string_pretty(history)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    tokio::fs::write(&history_path, history_json).await
        .map_err(|e| AppError::Io(format!("Failed to write history: {}", e)))?;
    
    log::info!("History saved successfully ({} items)", history.len());
    Ok(())
}

/// Load upload history
#[tauri::command]
pub async fn load_upload_history() -> CommandResult<Vec<UploadHistoryItem>> {
    match internal_load_history().await {
        Ok(history) => CommandResult::success(history),
        Err(e) => {
            log::error!("Load history error: {:?}", e);
            CommandResult::error(e)
        }
    }
}

async fn internal_load_history() -> AppResult<Vec<UploadHistoryItem>> {
    let history_path = get_history_path()?;
    
    if !history_path.exists() {
        return Ok(vec![]);
    }
    
    let history_json = tokio::fs::read_to_string(&history_path).await
        .map_err(|e| AppError::Io(format!("Failed to read history: {}", e)))?;
    
    let history: Vec<UploadHistoryItem> = serde_json::from_str(&history_json)
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    log::info!("History loaded successfully ({} items)", history.len());
    Ok(history)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_upload_config_serialization() {
        let config = UploadConfig {
            event_name: "Test Event".to_string(),
            access_code: "TEST-123".to_string(),
            mode: "moneytrash".to_string(),
            customer_email: Some("test@example.com".to_string()),
            single_photo_price: Some("10.00".to_string()),
            full_gallery_price: Some("100.00".to_string()),
            api_url: Some("http://localhost:8090".to_string()),
            desk_id: Some("DESK-01".to_string()),
            s3_access_key: None,
            s3_secret_key: None,
            s3_region: None,
            s3_bucket: None,
            s3_endpoint: None,
        };
        
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("Test Event"));
        assert!(json.contains("TEST-123"));
    }

    #[test]
    fn test_upload_history_item_serialization() {
        let item = UploadHistoryItem {
            id: "test-id".to_string(),
            event_name: "Test Event".to_string(),
            access_code: "TEST-123".to_string(),
            file_count: 10,
            timestamp: "2026-02-18T12:00:00Z".to_string(),
            mode: "moneytrash".to_string(),
        };
        
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("test-id"));
        assert!(json.contains("Test Event"));
    }
}
