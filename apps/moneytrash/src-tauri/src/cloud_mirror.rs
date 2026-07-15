//! Multi-Cloud Mirroring Module
//!
//! Provides S3 + R2 dual upload for redundancy and data durability.
//! Files are uploaded in parallel to both providers using AWS SDK chunked streaming.

use crate::errors::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};
use aws_sdk_s3::Client;

/// Cloud provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudProviderConfig {
    /// Provider type (s3 or r2)
    pub provider: String,
    /// Endpoint URL
    pub endpoint: String,
    /// Access key ID
    pub access_key: String,
    /// Secret access key
    pub secret_key: String,
    /// Bucket name
    pub bucket: String,
    /// Region
    pub region: String,
}

/// Cloud mirroring status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorStatus {
    /// Whether primary upload succeeded
    pub primary_success: bool,
    /// Whether mirror upload succeeded  
    pub mirror_success: bool,
    /// Primary URL (if successful)
    pub primary_url: Option<String>,
    /// Mirror URL (if successful)
    pub mirror_url: Option<String>,
    /// Error message if failed
    pub error: Option<String>,
}

/// Multi-cloud mirror for dual upload redundancy
pub struct CloudMirror {
    primary: Option<CloudProviderConfig>,
    mirror: Option<CloudProviderConfig>,
}

impl CloudMirror {
    /// Create a new CloudMirror instance
    pub fn new(primary: Option<CloudProviderConfig>, mirror: Option<CloudProviderConfig>) -> Self {
        Self { primary, mirror }
    }

    /// Check if mirroring is enabled
    pub fn is_enabled(&self) -> bool {
        self.primary.is_some() && self.mirror.is_some()
    }

    /// Upload file to both clouds in parallel
    pub async fn upload_parallel(
        &self,
        file_path: &Path,
        remote_path: &str,
    ) -> AppResult<MirrorStatus> {
        if !self.is_enabled() {
            return Err(AppError::Config("Cloud mirroring not configured".to_string()));
        }

        let primary = self.primary.as_ref().unwrap();
        let mirror = self.mirror.as_ref().unwrap();

        let primary_path = remote_path.to_string();
        let mirror_path = remote_path.to_string();
        let primary_config = primary.clone();
        let mirror_config = mirror.clone();
        let file_path_owned1 = file_path.to_path_buf();
        let file_path_owned2 = file_path.to_path_buf();

        let primary_handle = tokio::spawn(async move {
            Self::upload_chunked(&primary_config, &file_path_owned1, &primary_path).await
        });

        let mirror_handle = tokio::spawn(async move {
            Self::upload_chunked(&mirror_config, &file_path_owned2, &mirror_path).await
        });

        let primary_result = primary_handle.await
            .map_err(|e| AppError::Io(format!("Primary upload task failed: {}", e)))?;
        let mirror_result = mirror_handle.await
            .map_err(|e| AppError::Io(format!("Mirror upload task failed: {}", e)))?;

        let primary_url = primary_result.as_ref().ok().cloned();
        let mirror_url = mirror_result.as_ref().ok().cloned();

        let primary_success = primary_result.is_ok();
        let mirror_success = mirror_result.is_ok();
        let all_success = primary_success && mirror_success;

        Ok(MirrorStatus {
            primary_success,
            mirror_success,
            primary_url,
            mirror_url,
            error: if !all_success {
                Some("One or more cloud uploads failed".to_string())
            } else {
                None
            },
        })
    }

    /// Upload file using AWS SDK multipart chunked streaming
    async fn upload_chunked(
        config: &CloudProviderConfig,
        file_path: &Path,
        remote_path: &str,
    ) -> AppResult<String> {
        // Setup credentials and client
        let credentials = Credentials::new(
            &config.access_key,
            &config.secret_key,
            None,
            None,
            "manual",
        );
        
        let aws_config = aws_config::SdkConfig::builder()
            .credentials_provider(credentials)
            .region(aws_config::Region::new(config.region.clone()))
            .endpoint_url(&config.endpoint)
            .behavior_version(BehaviorVersion::latest())
            .build();
            
        let client = Client::new(&aws_config);
        
        // Initiate multipart upload
        let multipart_upload = client
            .create_multipart_upload()
            .bucket(&config.bucket)
            .key(remote_path)
            .send()
            .await
            .map_err(|e| AppError::Network(format!("Failed to create multipart upload: {}", e)))?;
            
        let upload_id = multipart_upload.upload_id().ok_or_else(|| {
            AppError::Network("Missing upload_id".to_string())
        })?;
        
        let mut file = File::open(file_path).await
            .map_err(|e| AppError::Io(format!("Failed to open file: {}", e)))?;
            
        // 5MB chunk size (minimum for S3/R2 multipart uploads)
        let chunk_size = 5 * 1024 * 1024;
        let mut buffer = vec![0; chunk_size];
        let mut completed_parts = Vec::new();
        let mut part_number = 1;
        
        loop {
            let mut chunk = Vec::new();
            let mut current_read = 0;
            
            while current_read < chunk_size {
                let n = file.read(&mut buffer).await
                    .map_err(|e| AppError::Io(format!("Failed to read file: {}", e)))?;
                if n == 0 {
                    break;
                }
                chunk.extend_from_slice(&buffer[..n]);
                current_read += n;
            }
            
            if chunk.is_empty() {
                break;
            }
            
            let byte_stream = ByteStream::from(chunk);
            let upload_part_res = client
                .upload_part()
                .bucket(&config.bucket)
                .key(remote_path)
                .upload_id(upload_id)
                .part_number(part_number)
                .body(byte_stream)
                .send()
                .await
                .map_err(|e| AppError::Network(format!("Failed to upload part {}: {}", part_number, e)))?;
                
            let completed_part = CompletedPart::builder()
                .part_number(part_number)
                .e_tag(upload_part_res.e_tag().unwrap_or_default())
                .build();
                
            completed_parts.push(completed_part);
            part_number += 1;
        }
        
        // Complete the multipart upload
        let completed_multipart_upload = CompletedMultipartUpload::builder()
            .set_parts(Some(completed_parts))
            .build();
            
        client
            .complete_multipart_upload()
            .bucket(&config.bucket)
            .key(remote_path)
            .upload_id(upload_id)
            .multipart_upload(completed_multipart_upload)
            .send()
            .await
            .map_err(|e| AppError::Network(format!("Failed to complete multipart upload: {}", e)))?;

        Ok(format!("{}://{}/{}", config.provider, config.bucket, remote_path))
    }
}

/// Configuration for multi-cloud mirroring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorConfig {
    /// Enable multi-cloud mirroring
    pub enabled: bool,
    /// Primary cloud provider (S3)
    pub primary: Option<CloudProviderConfig>,
    /// Mirror cloud provider (R2)
    pub mirror: Option<CloudProviderConfig>,
    /// Sync metadata between providers
    pub sync_metadata: bool,
}

impl Default for MirrorConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            primary: None,
            mirror: None,
            sync_metadata: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cloud_mirror_disabled() {
        let mirror = CloudMirror::new(None, None);
        assert!(!mirror.is_enabled());
    }

    #[test]
    fn test_cloud_mirror_enabled() {
        let config = CloudProviderConfig {
            provider: "s3".to_string(),
            endpoint: "https://s3.amazonaws.com".to_string(),
            access_key: "test".to_string(),
            secret_key: "test".to_string(),
            bucket: "test-bucket".to_string(),
            region: "us-east-1".to_string(),
        };
        let mirror = CloudMirror::new(Some(config.clone()), Some(config));
        assert!(mirror.is_enabled());
    }

    #[test]
    fn test_mirror_config_default() {
        let config = MirrorConfig::default();
        assert!(!config.enabled);
        assert!(config.primary.is_none());
        assert!(config.mirror.is_none());
    }
}
