// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent};

mod checksum;
mod commands;
mod errors;
mod state;

use state::UploadState;

fn main() {
    // Initialize logging
    env_logger::init();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .manage(UploadState::new())
        .invoke_handler(tauri::generate_handler![
            // File operations
            commands::file::select_files,
            commands::file::select_folder,
            commands::file::read_file,
            commands::file::read_file_chunk,
            commands::file::write_file,
            commands::file::create_directory,
            commands::file::file_exists,
            commands::file::get_app_directory,
            commands::file::calculate_file_checksums,
            
            // Upload operations
            commands::upload::upload_file_chunk,
            commands::upload::finalize_upload,
            commands::upload::get_upload_progress,
            commands::upload::cancel_upload,
            commands::upload::get_active_uploads,
            commands::upload::validate_files,
            commands::upload::start_native_upload,
            
            // Configuration
            commands::config::save_upload_config,
            commands::config::load_upload_config,
            commands::config::load_upload_history,
            commands::config::save_upload_history,
            
            // Notifications
            commands::notification::show_notification,
            commands::notification::open_external_link,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Check if any uploads are in progress
                let app_handle = window.app_handle();
                let state = app_handle.state::<UploadState>();
                
                // We can't easily check async state here, but we could
                // implement a flag in the future to prevent closing during uploads
                let _ = api;
            }
        })
        .setup(|app| {
            // Initialize state from persistent storage
            let state = app.state::<UploadState>();
            tauri::async_runtime::block_on(async {
                if let Err(e) = state.initialize().await {
                    log::warn!("Failed to initialize state: {}", e);
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
