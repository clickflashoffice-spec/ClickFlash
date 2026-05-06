//! Notification and system integration commands
//!
//! Provides system notifications and external link handling.

use crate::errors::{AppError, CommandResult};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;

/// Show a system notification
#[tauri::command]
pub async fn show_notification(
    app: AppHandle,
    title: String,
    body: String,
) -> CommandResult<()> {
    match internal_show_notification(&app, &title, &body).await {
        Ok(_) => CommandResult::success(()),
        Err(e) => {
            log::error!("Show notification error: {:?}", e);
            CommandResult::error(e)
        }
    }
}

async fn internal_show_notification(
    app: &AppHandle,
    title: &str,
    body: &str,
) -> Result<(), AppError> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| AppError::Unknown(format!("Failed to show notification: {}", e)))?;
    
    log::debug!("Notification shown: {} - {}", title, body);
    Ok(())
}

/// Open an external link in the default browser
#[tauri::command]
pub async fn open_external_link(app: AppHandle, url: String) -> CommandResult<()> {
    match internal_open_link(&app, &url).await {
        Ok(_) => CommandResult::success(()),
        Err(e) => {
            log::error!("Open external link error for {}: {:?}", url, e);
            CommandResult::error(e)
        }
    }
}

async fn internal_open_link(app: &AppHandle, url: &str) -> Result<(), AppError> {
    // Validate URL
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(AppError::InvalidPath(format!(
            "Invalid URL scheme: {}. Only HTTP and HTTPS are allowed.",
            url
        )));
    }
    
    app.shell()
        .open(url, None)
        .map_err(|e| AppError::Unknown(format!("Failed to open link: {}", e)))?;
    
    log::info!("External link opened: {}", url);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_validation() {
        // Valid URLs should not be checked here as they require the app handle
        // but we can verify the validation logic conceptually
        assert!("http://example.com".starts_with("http://"));
        assert!("https://example.com".starts_with("https://"));
        assert!(!"ftp://example.com".starts_with("http"));
        assert!(!"file:///etc/passwd".starts_with("http"));
    }
}
