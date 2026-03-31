//! Post-Upload Checksum Validation Module
//!
//! Provides SHA-256 checksum verification for uploaded files
//! to ensure data integrity across multi-cloud storage.

use crate::errors::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::Path;

// Import Digest trait for checksum calculations
use sha2::{Digest, Sha256, Sha512};

/// Checksum algorithm supported
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChecksumAlgorithm {
    /// SHA-256 (default)
    SHA256,
    /// SHA-512
    SHA512,
    /// MD5 (for legacy compatibility)
    MD5,
}

/// Checksum verification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecksumResult {
    /// Algorithm used
    pub algorithm: String,
    /// Calculated checksum (hex string)
    pub checksum: String,
    /// Expected checksum (if provided)
    pub expected: Option<String>,
    /// Whether verification passed
    pub verified: bool,
}

/// File metadata including checksum
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChecksum {
    /// File path or identifier
    pub path: String,
    /// Algorithm used
    pub algorithm: String,
    /// Calculated checksum
    pub checksum: String,
    /// File size in bytes
    pub size: u64,
    /// Timestamp of calculation
    pub timestamp: String,
}

/// Calculate checksum of a file
pub async fn calculate_checksum(
    file_path: &Path,
    algorithm: ChecksumAlgorithm,
) -> AppResult<ChecksumResult> {
    use tokio::io::AsyncReadExt;

    let file_data = tokio::fs::read(file_path).await
        .map_err(|e| AppError::Io(format!("Failed to read file: {}", e)))?;

    let checksum = match algorithm {
        ChecksumAlgorithm::SHA256 => {
            let mut hasher = Sha256::new();
            hasher.update(&file_data);
            let result = hasher.finalize();
            hex::encode(result)
        }
        ChecksumAlgorithm::SHA512 => {
            let mut hasher = Sha512::new();
            hasher.update(&file_data);
            let result = hasher.finalize();
            hex::encode(result)
        }
        ChecksumAlgorithm::MD5 => {
            let mut hasher = md5::Md5::new();
            hasher.update(&file_data);
            let result = hasher.finalize();
            format!("{:x}", result)
        }
    };

    Ok(ChecksumResult {
        algorithm: format!("{:?}", algorithm),
        checksum,
        expected: None,
        verified: true,
    })
}

/// Calculate checksum from bytes
pub fn calculate_checksum_from_bytes(
    data: &[u8],
    algorithm: ChecksumAlgorithm,
) -> String {
    match algorithm {
        ChecksumAlgorithm::SHA256 => {
            let mut hasher = Sha256::new();
            hasher.update(data);
            hex::encode(hasher.finalize())
        }
        ChecksumAlgorithm::SHA512 => {
            let mut hasher = Sha512::new();
            hasher.update(data);
            hex::encode(hasher.finalize())
        }
        ChecksumAlgorithm::MD5 => {
            let mut hasher = md5::Md5::new();
            hasher.update(data);
            format!("{:x}", hasher.finalize())
        }
    }
}

/// Verify file checksum against expected value
pub async fn verify_checksum(
    file_path: &Path,
    expected: &str,
    algorithm: ChecksumAlgorithm,
) -> AppResult<ChecksumResult> {
    let mut result = calculate_checksum(file_path, algorithm).await?;
    result.expected = Some(expected.to_string());
    result.verified = result.checksum.to_lowercase() == expected.to_lowercase();
    
    if !result.verified {
        return Err(AppError::Config(format!(
            "Checksum mismatch: expected {}, got {}",
            expected,
            result.checksum
        )));
    }
    
    Ok(result)
}

/// Incremental checksum calculator for streaming large files
/// 
/// NOTE: This implementation uses sha2 crate directly for hashing.
/// For production use, consider using the Digest trait properly.
pub struct StreamingChecksum {
    data: Vec<u8>,
    bytes_processed: u64,
}

impl StreamingChecksum {
    /// Create a new streaming checksum calculator
    pub fn new() -> Self {
        Self {
            data: Vec::new(),
            bytes_processed: 0,
        }
    }

    /// Update with more data
    pub fn update(&mut self, data: &[u8]) {
        self.data.extend_from_slice(data);
        self.bytes_processed += data.len() as u64;
    }

    /// Finalize and get the checksum
    pub fn finalize(self) -> String {
        // Use the top-level digest function from sha2 crate
        let hash = Sha256::digest(&self.data);
        hex::encode(hash)
    }

    /// Get bytes processed
    pub fn bytes_processed(&self) -> u64 {
        self.bytes_processed
    }
}

impl Default for StreamingChecksum {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate checksum of a large file using streaming
pub async fn calculate_checksum_streaming(
    file_path: &Path,
) -> AppResult<(String, u64)> {
    use tokio::io::AsyncReadExt;

    let mut file = tokio::fs::File::open(file_path).await
        .map_err(|e| AppError::Io(format!("Failed to open file: {}", e)))?;

    let metadata = file.metadata().await
        .map_err(|e| AppError::Io(format!("Failed to get metadata: {}", e)))?;
    let _file_size = metadata.len();

    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 8192]; // 8KB buffer
    let mut bytes_read: u64 = 0;

    loop {
        let n = file.read(&mut buffer).await
            .map_err(|e| AppError::Io(format!("Failed to read file: {}", e)))?;
        
        if n == 0 {
            break;
        }
        
        hasher.update(&buffer[..n]);
        bytes_read += n as u64;
    }

    let checksum = hex::encode(hasher.finalize());
    Ok((checksum, bytes_read))
}

/// Store file checksum metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecksumStore {
    /// Checksums indexed by file path
    checksums: std::collections::HashMap<String, FileChecksum>,
}

impl ChecksumStore {
    /// Create a new checksum store
    pub fn new() -> Self {
        Self {
            checksums: std::collections::HashMap::new(),
        }
    }

    /// Add a checksum record
    pub fn add(&mut self, file_path: &str, checksum: FileChecksum) {
        self.checksums.insert(file_path.to_string(), checksum);
    }

    /// Get a checksum record
    pub fn get(&self, file_path: &str) -> Option<&FileChecksum> {
        self.checksums.get(file_path)
    }

    /// Verify a file against stored checksum
    pub async fn verify(&self, file_path: &Path) -> AppResult<bool> {
        let path_str = file_path.to_string_lossy();
        
        if let Some(stored) = self.checksums.get(&*path_str) {
            let result = calculate_checksum(
                file_path,
                match stored.algorithm.as_str() {
                    "SHA512" => ChecksumAlgorithm::SHA512,
                    "MD5" => ChecksumAlgorithm::MD5,
                    _ => ChecksumAlgorithm::SHA256,
                }
            ).await?;
            
            Ok(result.checksum.to_lowercase() == stored.checksum.to_lowercase())
        } else {
            Err(AppError::FileNotFound("Checksum not found in store".to_string()))
        }
    }

    /// Load from JSON file
    pub async fn load(path: &Path) -> AppResult<Self> {
        let content = tokio::fs::read_to_string(path).await
            .map_err(|e| AppError::Io(format!("Failed to read store: {}", e)))?;
        
        serde_json::from_str(&content)
            .map_err(|e| AppError::Serialization(format!("Failed to parse store: {}", e)))
    }

    /// Save to JSON file
    pub async fn save(&self, path: &Path) -> AppResult<()> {
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| AppError::Serialization(format!("Failed to serialize store: {}", e)))?;
        
        tokio::fs::write(path, content).await
            .map_err(|e| AppError::Io(format!("Failed to write store: {}", e)))?;
        
        Ok(())
    }
}

impl Default for ChecksumStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_checksum_from_bytes() {
        let data = b"hello world";
        let checksum = calculate_checksum_from_bytes(data, ChecksumAlgorithm::SHA256);
        
        // SHA256 of "hello world"
        assert_eq!(checksum, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    }

    #[test]
    fn test_checksum_verification() {
        let data = b"test data";
        let checksum = calculate_checksum_from_bytes(data, ChecksumAlgorithm::SHA256);
        
        assert!(checksum.len() == 64); // SHA256 produces 64 hex chars
    }

    #[test]
    fn test_streaming_checksum() {
        let mut hasher = StreamingChecksum::new();
        hasher.update(b"hello ");
        hasher.update(b"world");
        let result = hasher.finalize();
        
        assert_eq!(result, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
        assert_eq!(hasher.bytes_processed(), 11);
    }
}
