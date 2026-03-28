//! File system commands
//!
//! Provides secure file system operations with proper validation
//! and error handling.

use crate::errors::{AppError, AppResult, CommandResult};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FilePath;

/// Supported image extensions
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "heic", "webp", "gif", "raw", "cr2", "nef", "arw"];

/// Maximum file size (500MB)
const MAX_FILE_SIZE: u64 = 500 * 1024 * 1024;

/// File information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    #[serde(rename = "mimeType")]
    pub mime_type: Option<String>,
}

/// Check if a file has an image extension
fn is_image_file(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        if let Some(ext_str) = ext.to_str() {
            let ext_lower = ext_str.to_lowercase();
            return IMAGE_EXTENSIONS.contains(&ext_lower.as_str());
        }
    }
    false
}

/// Validate file path for security
fn validate_path(path: &str) -> AppResult<&Path> {
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

/// Select files using native file dialog
#[tauri::command]
pub async fn select_files(app: AppHandle, multiple: bool) -> Result<Vec<FileInfo>, String> {
    match internal_select_files(&app, multiple).await {
        Ok(files) => Ok(files),
        Err(e) => {
            log::error!("Select files error: {:?}", e);
            Err(e.to_string())
        }
    }
}

async fn internal_select_files(app: &AppHandle, _multiple: bool) -> AppResult<Vec<FileInfo>> {
    let files = app
        .dialog()
        .file()
        .set_title("Select Photos to Upload")
        .add_filter("Images", &["jpg", "jpeg", "png", "heic", "webp", "gif", "raw"])
        .add_filter("All Files", &["*"])
        .blocking_pick_files();

    match files {
        Some(paths) => {
            let mut file_infos = Vec::new();
            
            for path in paths {
                let file_path = match &path {
                    FilePath::Path(p) => p.to_string_lossy().to_string(),
                    FilePath::Url(u) => u.to_string(),
                };
                
                // Validate path
                if let Err(e) = validate_path(&file_path) {
                    log::warn!("Invalid path skipped: {:?}", e);
                    continue;
                }
                
                match tokio::fs::metadata(&file_path).await {
                    Ok(metadata) => {
                        // Check file size
                        if metadata.len() > MAX_FILE_SIZE {
                            log::warn!("File too large, skipped: {}", file_path);
                            continue;
                        }
                        
                        let name = Path::new(&file_path)
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| "unknown".to_string());
                        
                        file_infos.push(FileInfo {
                            name,
                            path: file_path.clone(),
                            size: metadata.len(),
                            mime_type: mime_guess::from_path(&file_path).first().map(|m| m.to_string()),
                        });
                    }
                    Err(e) => {
                        log::warn!("Failed to read metadata for {}: {}", file_path, e);
                    }
                }
            }
            
            Ok(file_infos)
        }
        None => Ok(vec![]),
    }
}

/// Recursively scan a folder for image files
async fn scan_folder_for_images(folder_path: &str) -> AppResult<Vec<FileInfo>> {
    log::info!("Scanning folder for images: {}", folder_path);
    let path = Path::new(folder_path);
    
    if !path.exists() {
        log::error!("Folder does not exist: {}", folder_path);
        return Err(AppError::DirectoryNotFound(folder_path.to_string()));
    }
    
    if !path.is_dir() {
        log::error!("Path is not a directory: {}", folder_path);
        return Err(AppError::InvalidPath(folder_path.to_string()));
    }
    
    let mut image_files = Vec::new();
    scan_dir_recursive(path, &mut image_files).await?;
    
    log::info!("Found {} image files in folder: {}", image_files.len(), folder_path);
    Ok(image_files)
}

async fn scan_dir_recursive(dir: &Path, files: &mut Vec<FileInfo>) -> AppResult<()> {
    log::debug!("Scanning directory: {}", dir.display());
    let mut entries = tokio::fs::read_dir(dir).await
        .map_err(|e| AppError::Io(format!("Failed to read directory: {}", e)))?;
    
    let mut file_count = 0;
    let mut dir_count = 0;
    
    while let Some(entry) = entries.next_entry().await
        .map_err(|e| AppError::Io(format!("Failed to read entry: {}", e)))? 
    {
        let path = entry.path();
        
        if path.is_dir() {
            dir_count += 1;
            // Recursively scan subdirectories
            Box::pin(scan_dir_recursive(&path, files)).await?;
        } else if path.is_file() && is_image_file(&path) {
            file_count += 1;
            match entry.metadata().await {
                Ok(metadata) => {
                    // Check file size
                    if metadata.len() > MAX_FILE_SIZE {
                        log::warn!("File too large, skipped: {}", path.display());
                        continue;
                    }
                    
                    let name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| "unknown".to_string());
                    
                    files.push(FileInfo {
                        name,
                        path: path.to_string_lossy().to_string(),
                        size: metadata.len(),
                        mime_type: mime_guess::from_path(&path).first().map(|m| m.to_string()),
                    });
                }
                Err(e) => {
                    log::warn!("Failed to read metadata for {}: {}", path.display(), e);
                }
            }
        }
    }
    
    log::debug!("Directory scan complete: {} - found {} subdirs, {} images", 
        dir.display(), dir_count, file_count);
    Ok(())
}

/// Select folder using native dialog
#[tauri::command]
pub async fn select_folder(app: AppHandle) -> Result<Option<Vec<FileInfo>>, String> {
    match internal_select_folder(&app).await {
        Ok(files) => Ok(files),
        Err(e) => {
            log::error!("Select folder error: {:?}", e);
            Err(e.to_string())
        }
    }
}

async fn internal_select_folder(app: &AppHandle) -> AppResult<Option<Vec<FileInfo>>> {
    log::info!("Opening folder picker dialog...");
    let folder = app
        .dialog()
        .file()
        .set_title("Select Folder to Upload")
        .blocking_pick_folder();

    match folder {
        Some(path) => {
            let folder_path = match &path {
                FilePath::Path(p) => p.to_string_lossy().to_string(),
                FilePath::Url(u) => u.to_string(),
            };
            
            log::info!("Folder selected: {}", folder_path);
            
            // Validate path
            validate_path(&folder_path)?;
            
            // Scan folder recursively for image files
            let image_files = scan_folder_for_images(&folder_path).await?;
            log::info!("Folder scan complete. Found {} image files", image_files.len());
            Ok(Some(image_files))
        }
        None => {
            log::info!("Folder picker cancelled by user");
            Ok(None)
        }
    }
}

/// Read file contents
#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String> {
    match internal_read_file(&path).await {
        Ok(data) => Ok(data),
        Err(e) => {
            log::error!("Read file error for {}: {:?}", path, e);
            Err(e.to_string())
        }
    }
}

async fn internal_read_file(path: &str) -> AppResult<Vec<u8>> {
    validate_path(path)?;
    
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }
    
    // Check file size before reading
    let metadata = tokio::fs::metadata(path).await
        .map_err(|e| AppError::Io(e.to_string()))?;
    
    if metadata.len() > MAX_FILE_SIZE {
        return Err(AppError::FileTooLarge(
            format!("File exceeds maximum size of {}MB", MAX_FILE_SIZE / 1024 / 1024)
        ));
    }
    
    tokio::fs::read(path).await
        .map_err(|e| AppError::Io(format!("Failed to read file: {}", e)))
}

/// Read a chunk of a file (for resumable uploads)
#[tauri::command]
pub async fn read_file_chunk(path: String, offset: u64, length: u64) -> CommandResult<Vec<u8>> {
    match internal_read_file_chunk(&path, offset, length).await {
        Ok(data) => CommandResult::success(data),
        Err(e) => {
            log::error!("Read file chunk error for {} at offset {}: {:?}", path, offset, e);
            CommandResult::error(e)
        }
    }
}

async fn internal_read_file_chunk(path: &str, offset: u64, length: u64) -> AppResult<Vec<u8>> {
    use tokio::io::{AsyncReadExt, AsyncSeekExt};
    
    validate_path(path)?;
    
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }
    
    // Check file size
    let metadata = tokio::fs::metadata(path).await
        .map_err(|e| AppError::Io(e.to_string()))?;
    
    if offset >= metadata.len() {
        return Err(AppError::Io("Offset exceeds file size".to_string()));
    }
    
    // Open file
    let mut file = tokio::fs::File::open(path).await
        .map_err(|e| AppError::Io(format!("Failed to open file: {}", e)))?;
    
    // Seek to offset
    file.seek(std::io::SeekFrom::Start(offset)).await
        .map_err(|e| AppError::Io(format!("Failed to seek in file: {}", e)))?;
    
    // Read chunk (limit to remaining file size)
    let remaining = metadata.len() - offset;
    let to_read = length.min(remaining) as usize;
    let mut buffer = vec![0u8; to_read];
    
    let bytes_read = file.read_exact(&mut buffer).await
        .map_err(|e| AppError::Io(format!("Failed to read file chunk: {}", e)))?;
    
    Ok(buffer)
}

/// Write file contents
#[tauri::command]
pub async fn write_file(path: String, data: Vec<u8>) -> CommandResult<()> {
    match internal_write_file(&path, &data).await {
        Ok(_) => CommandResult::success(()),
        Err(e) => {
            log::error!("Write file error for {}: {:?}", path, e);
            CommandResult::error(e)
        }
    }
}

async fn internal_write_file(path: &str, data: &[u8]) -> AppResult<()> {
    validate_path(path)?;
    
    let path_obj = Path::new(path);
    
    // Create parent directories if needed
    if let Some(parent) = path_obj.parent() {
        tokio::fs::create_dir_all(parent).await
            .map_err(|e| AppError::Io(format!("Failed to create directory: {}", e)))?;
    }
    
    tokio::fs::write(path, data).await
        .map_err(|e| AppError::Io(format!("Failed to write file: {}", e)))
}

/// Create directory
#[tauri::command]
pub async fn create_directory(path: String) -> CommandResult<()> {
    match internal_create_directory(&path).await {
        Ok(_) => CommandResult::success(()),
        Err(e) => {
            log::error!("Create directory error for {}: {:?}", path, e);
            CommandResult::error(e)
        }
    }
}

async fn internal_create_directory(path: &str) -> AppResult<()> {
    validate_path(path)?;
    
    tokio::fs::create_dir_all(path).await
        .map_err(|e| AppError::Io(format!("Failed to create directory: {}", e)))
}

/// Check if file exists
#[tauri::command]
pub async fn file_exists(path: String) -> CommandResult<bool> {
    match validate_path(&path) {
        Ok(_) => CommandResult::success(Path::new(&path).exists()),
        Err(_) => CommandResult::success(false),
    }
}

/// Get application data directory
#[tauri::command]
pub async fn get_app_directory() -> CommandResult<String> {
    match dirs::data_dir() {
        Some(dir) => {
            let app_dir = dir.join("moneytrash-uploader");
            
            // Create directory if it doesn't exist
            if let Err(e) = tokio::fs::create_dir_all(&app_dir).await {
                return CommandResult::error(AppError::Io(format!(
                    "Failed to create app directory: {}",
                    e
                )));
            }
            
            CommandResult::success(app_dir.to_string_lossy().to_string())
        }
        None => CommandResult::error(AppError::Config(
            "Could not find data directory".to_string()
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_image_file() {
        assert!(is_image_file(Path::new("test.jpg")));
        assert!(is_image_file(Path::new("test.JPEG")));
        assert!(is_image_file(Path::new("test.png")));
        assert!(!is_image_file(Path::new("test.txt")));
        assert!(!is_image_file(Path::new("test.exe")));
    }

    #[test]
    fn test_validate_path() {
        assert!(validate_path("/valid/path/file.txt").is_ok());
        assert!(validate_path("../invalid/path").is_err());
        assert!(validate_path("path/with/~tilde").is_err());
    }
}
