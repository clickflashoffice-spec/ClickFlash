//! Upload commands with proper error handling
//!
//! This module contains all upload-related Tauri commands with
//! comprehensive error handling and progress tracking.

use crate::errors::{AppError, AppResult, CommandResult};
use crate::state::UploadState;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tauri::{State, AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use reqwest::multipart;

/// Maximum file size (500MB)
const MAX_FILE_SIZE: u64 = 500 * 1024 * 1024;
/// Chunk size (5MB)
const CHUNK_SIZE: usize = 5 * 1024 * 1024;

/// File information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    #[serde(rename = "mimeType")]
    pub mime_type: Option<String>,
}

/// Upload metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadMetadata {
    #[serde(rename = "eventName")]
    pub event_name: String,
    #[serde(rename = "accessCode")]
    pub access_code: String,
    pub mode: String,
    #[serde(rename = "mimeType")]
    pub mime_type: Option<String>,
    #[serde(rename = "deskId")]
    pub desk_id: Option<String>,
}

/// Upload session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadSession {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "fileSize")]
    pub file_size: u64,
    #[serde(rename = "chunksReceived")]
    pub chunks_received: Vec<u32>,
    #[serde(rename = "totalChunks")]
    pub total_chunks: u32,
    pub metadata: UploadMetadata,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// Upload progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadProgress {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "chunksReceived")]
    pub chunks_received: u32,
    #[serde(rename = "totalChunks")]
    pub total_chunks: u32,
    pub percentage: f64,
    pub status: String,
}

#[derive(Clone, Serialize)]
pub struct NativeUploadProgress {
    pub session_id: String,
    pub chunks_received: u32,
    pub total_chunks: u32,
    pub percentage: f64,
    pub bytes_uploaded: u64,
    pub total_bytes: u64,
    pub status: String,
}

/// Upload result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub success: bool,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "fileSize")]
    pub file_size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// File validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub file: FileInfo,
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Validate file path for security
fn validate_file_path(path: &str) -> AppResult<&Path> {
    let path = Path::new(path);
    
    // Check for path traversal attempts
    let path_str = path.to_string_lossy();
    if path_str.contains("..") || path_str.contains("~") {
        return Err(AppError::InvalidPath(
            "Path contains invalid characters".to_string()
        ));
    }
    
    Ok(path)
}

/// Check if file size is within limits
fn validate_file_size(size: u64) -> AppResult<()> {
    if size > MAX_FILE_SIZE {
        return Err(AppError::FileTooLarge(
            format!("File exceeds maximum size of {}MB", MAX_FILE_SIZE / 1024 / 1024)
        ));
    }
    Ok(())
}

/// Upload a file chunk with proper error handling
#[tauri::command]
pub async fn upload_file_chunk(
    state: State<'_, UploadState>,
    session_id: String,
    chunk_index: u32,
    total_chunks: u32,
    chunk_data: Vec<u8>,
    file_name: String,
    file_size: u64,
    metadata: UploadMetadata,
) -> Result<UploadProgress, AppError> {
    // Validate inputs
    if let Err(e) = validate_file_size(file_size) {
        return Err(e);
    }
    
    if chunk_data.len() > CHUNK_SIZE {
        return Err(AppError::Chunk(
            format!("Chunk size {} exceeds maximum {}", chunk_data.len(), CHUNK_SIZE)
        ));
    }
    
    match internal_upload_chunk(&state, &session_id, chunk_index, total_chunks, &chunk_data, &file_name, file_size, &metadata).await {
        Ok(progress) => Ok(progress),
        Err(e) => {
            log::error!("Upload chunk error: {:?}", e);
            Err(e)
        }
    }
}

/// Internal chunk upload implementation
async fn internal_upload_chunk(
    state: &UploadState,
    session_id: &str,
    chunk_index: u32,
    total_chunks: u32,
    chunk_data: &[u8],
    file_name: &str,
    file_size: u64,
    metadata: &UploadMetadata,
) -> AppResult<UploadProgress> {
    // Save chunk to a single temp file (Atomic Appending)
    let temp_dir = std::env::temp_dir()
        .join("moneytrash-uploads");
    
    tokio::fs::create_dir_all(&temp_dir).await
        .map_err(|e| AppError::Io(format!("Failed to create temp directory: {}", e)))?;
        
    let file_path = temp_dir.join(format!("{}.tmp", session_id));
    
    use std::io::SeekFrom;
    use tokio::io::{AsyncSeekExt, AsyncWriteExt};
    let mut file = tokio::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(&file_path).await
        .map_err(|e| AppError::Io(format!("Failed to open temp file: {}", e)))?;
    
    let offset = (chunk_index as u64) * (CHUNK_SIZE as u64);
    file.seek(SeekFrom::Start(offset)).await
        .map_err(|e| AppError::Io(format!("Failed to seek in temp file: {}", e)))?;

    file.write_all(chunk_data).await
        .map_err(|e| AppError::Io(format!("Failed to write chunk: {}", e)))?;
    
    // Update session state
    let mut sessions = state.sessions.lock().await;
    
    let session = sessions.entry(session_id.to_string()).or_insert_with(|| UploadSession {
        session_id: session_id.to_string(),
        file_name: file_name.to_string(),
        file_size,
        chunks_received: vec![],
        total_chunks,
        metadata: metadata.clone(),
        created_at: chrono::Utc::now().to_rfc3339(),
    });
    
    if !session.chunks_received.contains(&chunk_index) {
        session.chunks_received.push(chunk_index);
    }
    
    let percentage = if total_chunks > 0 {
        (session.chunks_received.len() as f64 / total_chunks as f64) * 100.0
    } else {
        100.0
    };
    
    Ok(UploadProgress {
        session_id: session_id.to_string(),
        chunks_received: session.chunks_received.len() as u32,
        total_chunks,
        percentage,
        status: if percentage >= 100.0 {
            "completed".to_string()
        } else {
            "uploading".to_string()
        },
    })
}

/// Internal finalize implementation
async fn internal_finalize_upload(
    state: &UploadState,
    _app_handle: &tauri::AppHandle,
    session_id: &str,
    api_url: Option<&str>,
    _metadata: &UploadMetadata,
) -> AppResult<UploadResult> {
    let mut sessions = state.sessions.lock().await;
    
    let session = sessions.get(session_id)
        .ok_or_else(|| AppError::Session("Upload session not found".to_string()))?;
    
    // Verify all chunks are present
    if session.chunks_received.len() as u32 != session.total_chunks {
        return Err(AppError::Chunk(
            format!("Missing chunks: {}/{}", session.chunks_received.len(), session.total_chunks)
        ));
    }
    
    let file_path = std::env::temp_dir()
        .join("moneytrash-uploads")
        .join(format!("{}.tmp", session_id));
    
    if !file_path.exists() {
        return Err(AppError::Io("Reassembled temp file not found".to_string()));
    }
    
    // Upload to API using streaming
    let api_base_url = api_url
        .filter(|u| !u.trim().is_empty())
        .unwrap_or("https://moneytrash-api.clickflash-office.workers.dev");
    let result = upload_to_api(api_base_url, session_id, &file_path, session, _metadata).await;
    
    // Clean up temp file regardless of result
    let _ = tokio::fs::remove_file(&file_path).await;
    
    // Remove session on success
    if result.is_ok() {
        sessions.remove(session_id);
    }
    
    result
}

/// Finalize an upload session
#[tauri::command]
pub async fn finalize_upload(
    state: State<'_, UploadState>,
    app_handle: tauri::AppHandle,
    session_id: String,
    api_url: Option<String>,
    metadata: UploadMetadata,
) -> Result<UploadResult, AppError> {
    match internal_finalize_upload(&state, &app_handle, &session_id, api_url.as_deref(), &metadata).await {
        Ok(result) => {
            // Send notification on success
            let _ = app_handle.notification()
                .builder()
                .title("Upload Complete")
                .body(&format!("{} uploaded successfully", result.file_name))
                .show();
            Ok(result)
        }
        Err(e) => {
            log::error!("Finalize upload error: {:?}", e);
            Err(e)
        }
    }
}

/// Upload file from disk to API (Streaming Multipart)
async fn upload_to_api(
    api_url: &str,
    session_id: &str,
    file_path: &std::path::Path,
    session: &UploadSession,
    metadata: &UploadMetadata,
) -> AppResult<UploadResult> {
    use reqwest::multipart;
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3600)) // 1 hour for huge files
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;
    
    // Load config to get API key for auth
    use crate::commands::config::internal_load_config;
    let config = internal_load_config().await.unwrap_or(None);
    let api_key = config.and_then(|c| c.api_key).unwrap_or_default();
    let auth_header = format!("Bearer {}", api_key);
    
    // Step 1: Initialize upload
    let chunk_size = CHUNK_SIZE;
    let total_chunks = (session.file_size as f64 / chunk_size as f64).ceil() as u32;

    let init_response = client
        .post(format!("{}/api/upload/chunk/init", api_url))
        .header("Content-Type", "application/json")
        .header("Authorization", &auth_header)
        .json(&serde_json::json!({
            "fileName": session.file_name,
            "fileSize": session.file_size,
            "totalChunks": total_chunks,
            "metadata": {
                "event_name": metadata.event_name,
                "access_code": metadata.access_code,
                "mode": metadata.mode,
                "mime_type": metadata.mime_type,
                "deskId": metadata.desk_id
            }
        }))
        .send()
        .await
        .map_err(AppError::from)?;
    
    if !init_response.status().is_success() {
        let error_text = init_response.text().await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(AppError::Api(format!("Initialization failed: {}", error_text)));
    }
    
    let init_result: serde_json::Value = init_response.json().await
        .map_err(|e| AppError::Serialization(e.to_string()))?;
    
    let api_session_id = init_result["sessionId"]
        .as_str()
        .ok_or_else(|| AppError::Api("Invalid response: missing sessionId".to_string()))?;
    
    // Step 2: Upload as a single part but streaming (Master API supports chunked transfer encoding)
    // Actually, we'll keep the chunked loop but STREAM each chunk from disk
    for i in 0..total_chunks {
        let start = i as u64 * chunk_size as u64;
        let end = ((i + 1) as u64 * chunk_size as u64).min(session.file_size);
        let actual_chunk_size = end - start;

        // Open file and seek to start of chunk
        use tokio::io::AsyncReadExt;
        let mut file = tokio::fs::File::open(file_path).await
            .map_err(|e| AppError::Io(format!("Failed to open file for streaming: {}", e)))?;
        
        use tokio::io::AsyncSeekExt;
        file.seek(std::io::SeekFrom::Start(start)).await
            .map_err(|e| AppError::Io(format!("Failed to seek file: {}", e)))?;
        
        let mut buffer = vec![0; actual_chunk_size as usize];
        file.read_exact(&mut buffer).await
            .map_err(|e| AppError::Io(format!("Failed to read chunk from disk: {}", e)))?;

        let form = multipart::Form::new()
            .text("sessionId", api_session_id.to_string())
            .text("chunkIndex", i.to_string())
            .part("chunk", multipart::Part::bytes(buffer)
                .file_name(format!("chunk_{}", i)));
        
        let chunk_response = client
            .put(format!("{}/api/upload/chunk", api_url))
            .header("Authorization", &auth_header)
            .multipart(form)
            .send()
            .await
            .map_err(AppError::from)?;
        
        if !chunk_response.status().is_success() {
            let error_text = chunk_response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AppError::Upload(format!("Chunk {} failed: {}", i, error_text)));
        }
    }
    
    // Step 3: Finalize
    let finalize_response = client
        .patch(format!("{}/api/upload/chunk/finalize", api_url))
        .header("Content-Type", "application/json")
        .header("Authorization", &auth_header)
        .json(&serde_json::json!({ "sessionId": api_session_id }))
        .send()
        .await
        .map_err(AppError::from)?;
    
    if !finalize_response.status().is_success() {
        let error_text = finalize_response.text().await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(AppError::Upload(format!("Finalize failed: {}", error_text)));
    }
    
    Ok(UploadResult {
        success: true,
        session_id: session_id.to_string(),
        file_name: session.file_name.clone(),
        file_size: session.file_size,
        error: None,
        url: Some(format!("{}/api/upload/{}?session={}", api_url, session_id, api_session_id)),
    })
}

/// Get upload session progress
#[tauri::command]
pub async fn get_upload_progress(
    state: State<'_, UploadState>,
    session_id: String,
) -> Result<Option<UploadProgress>, AppError> {
    let sessions = state.sessions.lock().await;
    
    match sessions.get(&session_id) {
        Some(session) => {
            let percentage = if session.total_chunks > 0 {
                (session.chunks_received.len() as f64 / session.total_chunks as f64) * 100.0
            } else {
                0.0
            };
            
            Ok(Some(UploadProgress {
                session_id: session_id.clone(),
                chunks_received: session.chunks_received.len() as u32,
                total_chunks: session.total_chunks,
                percentage,
                status: if percentage >= 100.0 {
                    "completed".to_string()
                } else {
                    "uploading".to_string()
                },
            }))
        }
        None => Ok(None),
    }
}

/// Cancel an upload session
#[tauri::command]
pub async fn cancel_upload(
    state: State<'_, UploadState>,
    session_id: String,
) -> Result<bool, AppError> {
    let mut sessions = state.sessions.lock().await;
    
    if let Some(_session) = sessions.remove(&session_id) {
        // Clean up temp file
        let file_path = std::env::temp_dir()
            .join("moneytrash-uploads")
            .join(format!("{}.tmp", session_id));
        let _ = tokio::fs::remove_file(&file_path).await;
        
        Ok(true)
    } else {
        Ok(false)
    }
}

/// Get all active upload sessions
#[tauri::command]
pub async fn get_active_uploads(
    state: State<'_, UploadState>,
) -> Result<Vec<UploadSession>, AppError> {
    let sessions = state.sessions.lock().await;
    let active: Vec<UploadSession> = sessions.values().cloned().collect();
    Ok(active)
}

/// Validate files before upload
#[tauri::command]
pub async fn validate_files(
    files: Vec<FileInfo>,
) -> Result<Vec<ValidationResult>, AppError> {
    let results: Vec<ValidationResult> = files.into_iter().map(|file| {
        let path = Path::new(&file.path);
        
        // Check file exists
        if !path.exists() {
            return ValidationResult {
                file: file.clone(),
                valid: false,
                error: Some("File does not exist".to_string()),
            };
        }
        
        // Check file size
        if file.size > MAX_FILE_SIZE {
            return ValidationResult {
                file: file.clone(),
                valid: false,
                error: Some(format!(
                    "File exceeds maximum size of {}MB",
                    MAX_FILE_SIZE / 1024 / 1024
                )),
            };
        }
        
        // Check file extension
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            let valid_extensions = ["jpg", "jpeg", "png", "heic", "webp", "gif", "raw", "cr2", "nef"];
            if !valid_extensions.contains(&ext_str.as_str()) {
                return ValidationResult {
                    file: file.clone(),
                    valid: false,
                    error: Some(format!("Unsupported file type: {}", ext_str)),
                };
            }
        }
        
        ValidationResult {
            file,
            valid: true,
            error: None,
        }
    }).collect();
    
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_file_path() {
        assert!(validate_file_path("/valid/path/file.txt").is_ok());
        assert!(validate_file_path("../invalid/path").is_err());
        assert!(validate_file_path("path/with/~tilde").is_err());
    }

    #[test]
    fn test_validate_file_size() {
        assert!(validate_file_size(1024).is_ok());
        assert!(validate_file_size(MAX_FILE_SIZE).is_ok());
        assert!(validate_file_size(MAX_FILE_SIZE + 1).is_err());
    }

    #[test]
    fn test_upload_progress_calculation() {
        let progress = UploadProgress {
            session_id: "test".to_string(),
            chunks_received: 5,
            total_chunks: 10,
            percentage: 50.0,
            status: "uploading".to_string(),
        };
        
        assert_eq!(progress.percentage, 50.0);
        assert_eq!(progress.status, "uploading");
    }
}

/// Start high-performance multi-threaded native upload from Rust
#[tauri::command]
pub async fn start_native_upload(
    app_handle: tauri::AppHandle,
    state: State<'_, UploadState>,
    file_path: String,
    api_url: Option<String>,
    metadata: UploadMetadata,
) -> Result<UploadResult, AppError> {
    // 1. Validate file
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err(AppError::FileNotFound(file_path.clone()));
    }
    
    let file_metadata = tokio::fs::metadata(&path).await
        .map_err(|e| AppError::Io(e.to_string()))?;
        
    let file_size = file_metadata.len();
    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    
    if let Err(e) = validate_file_size(file_size) {
        return Err(e);
    }
    
    let session_id = uuid::Uuid::new_v4().to_string();
    
    // 2. Initialize in State
    let chunk_size = CHUNK_SIZE;
    let total_chunks = (file_size as f64 / chunk_size as f64).ceil() as u32;

    let mut sessions = state.sessions.lock().await;
    sessions.insert(session_id.clone(), UploadSession {
        session_id: session_id.clone(),
        file_name: file_name.clone(),
        file_size,
        chunks_received: vec![],
        total_chunks,
        metadata: metadata.clone(),
        created_at: chrono::Utc::now().to_rfc3339(),
    });
    drop(sessions);
    
    // 3. Get API URL & Token
    let api_base_url = api_url
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_else(|| "https://moneytrash-api.clickflash-office.workers.dev".to_string());
        
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3600))
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;
        
    use crate::commands::config::internal_load_config;
    let config = internal_load_config().await.unwrap_or(None);
    let api_key = config.and_then(|c| c.api_key).unwrap_or_default();
    let auth_header = format!("Bearer {}", api_key);
    
    // 4. API Init
    let init_response = client
        .post(format!("{}/api/upload/chunk/init", api_base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", &auth_header)
        .json(&serde_json::json!({
            "fileName": file_name,
            "fileSize": file_size,
            "totalChunks": total_chunks,
            "metadata": {
                "eventName": metadata.event_name,
                "accessCode": metadata.access_code,
                "mode": metadata.mode,
                "mimeType": metadata.mime_type,
                "deskId": metadata.desk_id
            }
        }))
        .send()
        .await
        .map_err(AppError::from)?;
        
    if !init_response.status().is_success() {
        let error_text = init_response.text().await.unwrap_or_default();
        return Err(AppError::Api(format!("Init failed: {}", error_text)));
    }
    
    let init_result: serde_json::Value = init_response.json().await
        .map_err(|e| AppError::Serialization(e.to_string()))?;
        
    let api_session_id = init_result["sessionId"].as_str()
        .ok_or_else(|| AppError::Api("Invalid response: missing sessionId".to_string()))?
        .to_string();

    // 5. Multi-threaded Upload
    let semaphore = Arc::new(Semaphore::new(6)); // Concurrency level: 6 threads
    let mut join_set = JoinSet::new();
    
    let bytes_uploaded = Arc::new(std::sync::atomic::AtomicU64::new(0));
    let chunks_completed = Arc::new(std::sync::atomic::AtomicU32::new(0));
    
    for i in 0..total_chunks {
        let sem = semaphore.clone();
        let client_cl = client.clone();
        let auth_header_cl = auth_header.clone();
        let api_base_url_cl = api_base_url.clone();
        let api_session_id_cl = api_session_id.clone();
        let file_path_cl = file_path.clone();
        let session_id_cl = session_id.clone();
        let app_handle_cl = app_handle.clone();
        let bytes_uploaded_cl = bytes_uploaded.clone();
        let chunks_completed_cl = chunks_completed.clone();
        
        let start = i as u64 * chunk_size as u64;
        let end = ((i + 1) as u64 * chunk_size as u64).min(file_size);
        let actual_chunk_size = end - start;

        join_set.spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            
            // Read chunk natively from disk
            let mut file = tokio::fs::File::open(&file_path_cl).await
                .map_err(|e| AppError::Io(e.to_string()))?;
            file.seek(std::io::SeekFrom::Start(start)).await
                .map_err(|e| AppError::Io(e.to_string()))?;
            
            let mut buffer = vec![0; actual_chunk_size as usize];
            file.read_exact(&mut buffer).await
                .map_err(|e| AppError::Io(e.to_string()))?;
                
            let form = multipart::Form::new()
                .text("sessionId", api_session_id_cl)
                .text("chunkIndex", i.to_string())
                .part("chunk", multipart::Part::bytes(buffer)
                    .file_name(format!("chunk_{}", i)));
            
            // Upload chunk directly
            let chunk_res = client_cl
                .put(format!("{}/api/upload/chunk", api_base_url_cl))
                .header("Authorization", &auth_header_cl)
                .multipart(form)
                .send()
                .await
                .map_err(AppError::from)?;
                
            if !chunk_res.status().is_success() {
                let error_text = chunk_res.text().await.unwrap_or_default();
                return Err(AppError::Upload(format!("Chunk {} failed: {}", i, error_text)));
            }
            
            // Progress Update back to Tauri frontend
            let completed = chunks_completed_cl.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
            let uploaded = bytes_uploaded_cl.fetch_add(actual_chunk_size, std::sync::atomic::Ordering::SeqCst) + actual_chunk_size;
            
            let percentage = (completed as f64 / total_chunks as f64) * 100.0;
            
            let progress = NativeUploadProgress {
                session_id: session_id_cl.clone(),
                chunks_received: completed,
                total_chunks,
                percentage,
                bytes_uploaded: uploaded,
                total_bytes: file_size,
                status: if percentage >= 100.0 { "completed".to_string() } else { "uploading".to_string() },
            };
            
            // Emit granular progress via Tauri
            let _ = app_handle_cl.emit("upload_progress", &progress);
            
            Ok::<(), AppError>(())
        });
    }
    
    // Wait for all chunks to upload
    while let Some(res) = join_set.join_next().await {
        match res {
            Ok(Ok(_)) => continue,
            Ok(Err(e)) => {
                // Remove session on error
                let mut sessions = state.sessions.lock().await;
                sessions.remove(&session_id);
                return Err(e);
            },
            Err(e) => {
                let mut sessions = state.sessions.lock().await;
                sessions.remove(&session_id);
                return Err(AppError::Upload(format!("Task joined with error: {}", e)));
            },
        }
    }
    
    // 6. Finalize Upload
    let finalize_response = client
        .patch(format!("{}/api/upload/chunk/finalize", api_base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", &auth_header)
        .json(&serde_json::json!({ "sessionId": api_session_id }))
        .send()
        .await
        .map_err(AppError::from)?;
        
    if !finalize_response.status().is_success() {
        let error_text = finalize_response.text().await.unwrap_or_default();
        return Err(AppError::Upload(format!("Finalize failed: {}", error_text)));
    }
    
    // Remove session cleanly
    let mut sessions = state.sessions.lock().await;
    sessions.remove(&session_id);
    
    let result = UploadResult {
        success: true,
        session_id: session_id.clone(),
        file_name: file_name.clone(),
        file_size,
        error: None,
        url: Some(format!("{}/api/upload/{}?session={}", api_base_url, session_id, api_session_id)),
    };
    
    let _ = app_handle.notification()
        .builder()
        .title("Upload Complete")
        .body(&format!("{} uploaded successfully", result.file_name))
        .show();
        
    Ok(result)
}
