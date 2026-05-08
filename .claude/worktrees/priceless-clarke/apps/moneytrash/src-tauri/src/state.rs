//! Application state management
//!
//! Provides thread-safe state sharing across Tauri commands
//! using proper async-aware locking mechanisms.

use crate::commands::upload::UploadSession;
use std::collections::HashMap;
use tokio::sync::Mutex;

/// Application state shared across commands
pub struct UploadState {
    /// Active upload sessions
    pub sessions: Mutex<HashMap<String, UploadSession>>,
    
    /// Global upload statistics
    pub stats: Mutex<UploadStats>,
    
    /// Application configuration
    pub config: Mutex<AppConfig>,
}

impl UploadState {
    /// Create a new state instance
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            stats: Mutex::new(UploadStats::default()),
            config: Mutex::new(AppConfig::default()),
        }
    }
    
    /// Initialize state from persistent storage
    pub async fn initialize(&self) -> Result<(), String> {
        // Load configuration from disk
        let config = self.load_config().await?;
        *self.config.lock().await = config;
        
        // Load stats from disk  
        let stats = self.load_stats().await?;
        *self.stats.lock().await = stats;
        
        Ok(())
    }
    
    /// Load configuration from disk
    async fn load_config(&self) -> Result<AppConfig, String> {
        let config_path = dirs::config_dir()
            .ok_or("Could not find config directory")?
            .join("moneytrash-uploader")
            .join("app_config.json");
        
        if !config_path.exists() {
            return Ok(AppConfig::default());
        }
        
        let content = tokio::fs::read_to_string(&config_path).await
            .map_err(|e| e.to_string())?;
        
        serde_json::from_str(&content)
            .map_err(|e| e.to_string())
    }
    
    /// Load statistics from disk
    async fn load_stats(&self) -> Result<UploadStats, String> {
        let stats_path = dirs::data_dir()
            .ok_or("Could not find data directory")?
            .join("moneytrash-uploader")
            .join("upload_stats.json");
        
        if !stats_path.exists() {
            return Ok(UploadStats::default());
        }
        
        let content = tokio::fs::read_to_string(&stats_path).await
            .map_err(|e| e.to_string())?;
        
        serde_json::from_str(&content)
            .map_err(|e| e.to_string())
    }
    
    /// Save configuration to disk
    pub async fn save_config(&self) -> Result<(), String> {
        let config = self.config.lock().await;
        let config_path = dirs::config_dir()
            .ok_or("Could not find config directory")?
            .join("moneytrash-uploader");
        
        tokio::fs::create_dir_all(&config_path).await
            .map_err(|e| e.to_string())?;
        
        let config_file = config_path.join("app_config.json");
        let content = serde_json::to_string_pretty(&*config)
            .map_err(|e| e.to_string())?;
        
        tokio::fs::write(&config_file, content).await
            .map_err(|e| e.to_string())
    }
    
    /// Save statistics to disk
    pub async fn save_stats(&self) -> Result<(), String> {
        let stats = self.stats.lock().await;
        let stats_path = dirs::data_dir()
            .ok_or("Could not find data directory")?
            .join("moneytrash-uploader");
        
        tokio::fs::create_dir_all(&stats_path).await
            .map_err(|e| e.to_string())?;
        
        let stats_file = stats_path.join("upload_stats.json");
        let content = serde_json::to_string_pretty(&*stats)
            .map_err(|e| e.to_string())?;
        
        tokio::fs::write(&stats_file, content).await
            .map_err(|e| e.to_string())
    }
}

impl Default for UploadState {
    fn default() -> Self {
        Self::new()
    }
}

/// Upload statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UploadStats {
    /// Total number of uploads
    pub total_uploads: u64,
    
    /// Total bytes uploaded
    pub total_bytes: u64,
    
    /// Successful uploads
    pub successful_uploads: u64,
    
    /// Failed uploads
    pub failed_uploads: u64,
    
    /// Last upload timestamp
    pub last_upload: Option<String>,
    
    /// Average upload speed (bytes/sec)
    pub avg_upload_speed: f64,
}

impl Default for UploadStats {
    fn default() -> Self {
        Self {
            total_uploads: 0,
            total_bytes: 0,
            successful_uploads: 0,
            failed_uploads: 0,
            last_upload: None,
            avg_upload_speed: 0.0,
        }
    }
}

impl UploadStats {
    /// Record a successful upload
    pub fn record_success(&mut self, bytes: u64, duration_secs: f64) {
        self.total_uploads += 1;
        self.successful_uploads += 1;
        self.total_bytes += bytes;
        self.last_upload = Some(chrono::Utc::now().to_rfc3339());
        
        // Update average speed using exponential moving average
        if duration_secs > 0.0 {
            let speed = bytes as f64 / duration_secs;
            self.avg_upload_speed = if self.avg_upload_speed == 0.0 {
                speed
            } else {
                0.7 * self.avg_upload_speed + 0.3 * speed
            };
        }
    }
    
    /// Record a failed upload
    pub fn record_failure(&mut self) {
        self.total_uploads += 1;
        self.failed_uploads += 1;
        self.last_upload = Some(chrono::Utc::now().to_rfc3339());
    }
    
    /// Get success rate as percentage
    pub fn success_rate(&self) -> f64 {
        if self.total_uploads == 0 {
            100.0
        } else {
            (self.successful_uploads as f64 / self.total_uploads as f64) * 100.0
        }
    }
}

/// Application configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AppConfig {
    /// Default API URL
    pub default_api_url: String,
    
    /// Maximum concurrent uploads
    pub max_concurrent_uploads: usize,
    
    /// Chunk size in bytes
    pub chunk_size: usize,
    
    /// Enable notifications
    pub enable_notifications: bool,
    
    /// Auto-retry failed uploads
    pub auto_retry: bool,
    
    /// Maximum retry attempts
    pub max_retries: u32,
    
    /// Preserve EXIF data
    pub preserve_exif: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            default_api_url: "http://localhost:8090".to_string(),
            max_concurrent_uploads: 3,
            chunk_size: 1024 * 1024, // 1MB
            enable_notifications: true,
            auto_retry: true,
            max_retries: 3,
            preserve_exif: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_upload_stats_default() {
        let stats = UploadStats::default();
        assert_eq!(stats.total_uploads, 0);
        assert_eq!(stats.success_rate(), 100.0);
    }

    #[test]
    fn test_upload_stats_record_success() {
        let mut stats = UploadStats::default();
        stats.record_success(1024, 1.0);
        
        assert_eq!(stats.total_uploads, 1);
        assert_eq!(stats.successful_uploads, 1);
        assert_eq!(stats.total_bytes, 1024);
        assert!(stats.avg_upload_speed > 0.0);
        assert!(stats.last_upload.is_some());
    }

    #[test]
    fn test_upload_stats_record_failure() {
        let mut stats = UploadStats::default();
        stats.record_failure();
        
        assert_eq!(stats.total_uploads, 1);
        assert_eq!(stats.failed_uploads, 1);
        assert_eq!(stats.success_rate(), 0.0);
    }

    #[test]
    fn test_upload_stats_success_rate() {
        let mut stats = UploadStats::default();
        stats.record_success(100, 1.0);
        stats.record_success(100, 1.0);
        stats.record_failure();
        
        assert!((stats.success_rate() - 66.67).abs() < 0.01);
    }

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert_eq!(config.max_concurrent_uploads, 3);
        assert_eq!(config.chunk_size, 1024 * 1024);
        assert!(config.enable_notifications);
        assert!(config.auto_retry);
    }
}
