pub mod ble;

use jni::JNIEnv;
use jni::objects::{JClass, JObject, JString};
use jni::sys::jstring;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STD};

type HmacSha256 = Hmac<Sha256>;

use rusqlite::{Connection, Result as SqlResult};

// -------------------------------------------------------------
// Core Engine Functions
// -------------------------------------------------------------

/// Queues a photo to the local offline SQLite database for syncing
fn queue_photo(db_path: &str, file_path: &str, metadata: &str) -> Result<String, String> {
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY,
            file_path TEXT NOT NULL,
            metadata TEXT,
            status TEXT NOT NULL
        )",
        (), // empty list of parameters
    ).map_err(|e| format!("Failed to create table: {}", e))?;

    conn.execute(
        "INSERT INTO photos (file_path, metadata, status) VALUES (?1, ?2, ?3)",
        (file_path, metadata, "pending"),
    ).map_err(|e| format!("Failed to insert photo: {}", e))?;

    Ok("Photo queued offline successfully".to_string())
}

/// Queues a generic sync event to the local offline SQLite database
fn enqueue_sync_event(db_path: &str, event_type: &str, endpoint: &str, method: &str, payload: &str, priority: &str) -> Result<String, String> {
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS offline_queue (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            method TEXT NOT NULL,
            payload TEXT,
            timestamp INTEGER NOT NULL,
            retryCount INTEGER NOT NULL,
            priority TEXT NOT NULL
        )",
        (), // empty list of parameters
    ).map_err(|e| format!("Failed to create table: {}", e))?;

    let id = format!("offline_{}_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis(), "rust");
    let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;

    conn.execute(
        "INSERT INTO offline_queue (id, type, endpoint, method, payload, timestamp, retryCount, priority) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (id, event_type, endpoint, method, payload, timestamp, 0, priority),
    ).map_err(|e| format!("Failed to insert sync event: {}", e))?;

    Ok("Sync event queued offline successfully".to_string())
}

#[derive(serde::Serialize)]
struct PhotoPayload<'a> {
    id: i32,
    file_path: &'a str,
    metadata: &'a str,
}

/// Syncs all pending photos to the Master Node and updates status to 'synced'
async fn sync_pending_photos(db_path: &str, master_url: &str) -> Result<String, String> {
    let mut conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let tx = conn.transaction().map_err(|e| format!("Tx failed: {}", e))?;

    let mut stmt = tx.prepare("SELECT id, file_path, metadata FROM photos WHERE status = 'pending'")
        .map_err(|e| format!("Prepare failed: {}", e))?;
    
    let mut pending_photos = Vec::new();
    {
        let mut rows = stmt.query([]).map_err(|e| format!("Query failed: {}", e))?;
        while let Some(row) = rows.next().unwrap_or(None) {
            let id: i32 = row.get(0).unwrap_or(0);
            let file_path: String = row.get(1).unwrap_or_default();
            let metadata: String = row.get(2).unwrap_or_default();
            pending_photos.push((id, file_path, metadata));
        }
    }

    if pending_photos.is_empty() {
        return Ok("0 photos pending sync".to_string());
    }

    let mut payload = Vec::new();
    for p in &pending_photos {
        payload.push(serde_json::json!({
            "id": p.0,
            "file_path": p.1,
            "metadata": p.2
        }));
    }

    let client = reqwest::Client::new();
    let res = client.post(master_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if res.status().is_success() {
        for p in &pending_photos {
            tx.execute("UPDATE photos SET status = 'synced' WHERE id = ?1", [p.0])
                .unwrap_or(0);
        }
        tx.commit().unwrap_or(());
        Ok(format!("Successfully synced {} photos", pending_photos.len()))
    } else {
        Err(format!("Master Node rejected payload. Status: {}", res.status()))
    }
}

/// Syncs generic pending events from offline_queue to the master or cloud endpoint
async fn sync_pending_events(db_path: &str, target_url_prefix: &str) -> Result<String, String> {
    let mut conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let tx = conn.transaction().map_err(|e| format!("Tx failed: {}", e))?;

    let mut stmt = tx.prepare("SELECT id, endpoint, method, payload FROM offline_queue ORDER BY timestamp ASC")
        .map_err(|e| format!("Prepare failed: {}", e))?;
    
    let mut pending_events = Vec::new();
    {
        let mut rows = stmt.query([]).map_err(|e| format!("Query failed: {}", e))?;
        while let Some(row) = rows.next().unwrap_or(None) {
            let id: String = row.get(0).unwrap_or_default();
            let endpoint: String = row.get(1).unwrap_or_default();
            let method: String = row.get(2).unwrap_or_default();
            let payload: String = row.get(3).unwrap_or_default();
            pending_events.push((id, endpoint, method, payload));
        }
    }

    if pending_events.is_empty() {
        return Ok("0 events pending sync".to_string());
    }

    let client = reqwest::Client::new();
    let mut success_count = 0;

    for event in &pending_events {
        let (id, endpoint, method, payload) = event;
        // Normalize endpoint
        let clean_path = if endpoint.starts_with('/') { endpoint.clone() } else { format!("/{}", endpoint) };
        
        let url = if target_url_prefix.ends_with('/') {
            format!("{}{}", &target_url_prefix[..target_url_prefix.len()-1], clean_path)
        } else {
            format!("{}{}", target_url_prefix, clean_path)
        };

        // For simplicity we handle POST and PUT here
        let mut req_builder = match method.as_str() {
            "POST" => client.post(&url),
            "PUT" => client.put(&url),
            "PATCH" => client.patch(&url),
            "DELETE" => client.delete(&url),
            _ => client.post(&url),
        };

        if !payload.is_empty() && payload != "null" {
            req_builder = req_builder.header("Content-Type", "application/json").body(payload.clone());
        }

        let res = req_builder.send().await;
        match res {
            Ok(r) if r.status().is_success() => {
                tx.execute("DELETE FROM offline_queue WHERE id = ?1", [id]).unwrap_or(0);
                success_count += 1;
            },
            Ok(_) | Err(_) => {
                tx.execute("UPDATE offline_queue SET retryCount = retryCount + 1 WHERE id = ?1", [id]).unwrap_or(0);
            }
        }
    }

    tx.commit().unwrap_or(());
    Ok(format!("Successfully synced {}/{} events", success_count, pending_events.len()))
}

// -------------------------------------------------------------
// JNI (Android) Bindings
// -------------------------------------------------------------

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_queuePhoto<'local>(
    mut env: JNIEnv<'local>,
    _this: JObject<'local>,
    db_path: JString<'local>,
    file_path: JString<'local>,
    metadata: JString<'local>,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let file_path_str: String = env.get_string(&file_path).unwrap().into();
    let metadata_str: String = env.get_string(&metadata).unwrap().into();

    let result = match queue_photo(&db_path_str, &file_path_str, &metadata_str) {
        Ok(msg) => msg,
        Err(e) => format!("ERROR: {}", e),
    };

    let output = env.new_string(result).unwrap();
    output.into_raw()
}

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_enqueueSyncEvent<'local>(
    mut env: JNIEnv<'local>,
    _this: JObject<'local>,
    db_path: JString<'local>,
    event_type: JString<'local>,
    endpoint: JString<'local>,
    method: JString<'local>,
    payload: JString<'local>,
    priority: JString<'local>,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let event_type_str: String = env.get_string(&event_type).unwrap().into();
    let endpoint_str: String = env.get_string(&endpoint).unwrap().into();
    let method_str: String = env.get_string(&method).unwrap().into();
    let payload_str: String = env.get_string(&payload).unwrap().into();
    let priority_str: String = env.get_string(&priority).unwrap().into();

    let result = match enqueue_sync_event(&db_path_str, &event_type_str, &endpoint_str, &method_str, &payload_str, &priority_str) {
        Ok(msg) => msg,
        Err(e) => format!("ERROR: {}", e),
    };

    let output = env.new_string(result).unwrap();
    output.into_raw()
}

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_syncPendingPhotos<'local>(
    mut env: JNIEnv<'local>,
    _this: JObject<'local>,
    db_path: JString<'local>,
    master_url: JString<'local>,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let master_url_str: String = env.get_string(&master_url).unwrap().into();

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(async {
        match sync_pending_photos(&db_path_str, &master_url_str).await {
            Ok(msg) => msg,
            Err(e) => format!("ERROR: {}", e),
        }
    });

    let output = env.new_string(result).unwrap();
    output.into_raw()
}

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_syncPendingEvents<'local>(
    mut env: JNIEnv<'local>,
    _this: JObject<'local>,
    db_path: JString<'local>,
    target_url_prefix: JString<'local>,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let prefix_str: String = env.get_string(&target_url_prefix).unwrap().into();

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(async {
        match sync_pending_events(&db_path_str, &prefix_str).await {
            Ok(msg) => msg,
            Err(e) => format!("ERROR: {}", e),
        }
    });

    let output = env.new_string(result).unwrap();
    output.into_raw()
}

// -------------------------------------------------------------
// Offline AI Culling (Blur / Blink Detection)
// -------------------------------------------------------------

#[derive(serde::Serialize)]
pub struct ImageAnalysisResult {
    pub is_blurry: bool,
    pub is_blinking: bool,
    pub focus_score: f64,
}

/// Analyzes an image for blur and blinks offline
pub fn analyze_image(image_path: &str) -> Result<String, String> {
    // 1. Decode image
    let img = image::open(image_path)
        .map_err(|e| format!("Failed to open image: {}", e))?
        .to_luma8();

    let width = img.width() as usize;
    let height = img.height() as usize;
    let pixels = img.into_raw();

    // 2. Calculate Laplacian variance (Blur detection)
    // Simplified 3x3 Laplacian convolution
    let mut sum = 0.0;
    let mut sum_sq = 0.0;
    let mut count = 0.0;

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let idx = y * width + x;
            let center = pixels[idx] as f64;
            let top = pixels[idx - width] as f64;
            let bottom = pixels[idx + width] as f64;
            let left = pixels[idx - 1] as f64;
            let right = pixels[idx + 1] as f64;

            // L = 4*center - top - bottom - left - right
            let laplacian = (4.0 * center) - top - bottom - left - right;
            sum += laplacian;
            sum_sq += laplacian * laplacian;
            count += 1.0;
        }
    }

    let mean = sum / count;
    let variance = (sum_sq / count) - (mean * mean);
    
    // Threshold for blur (typically 100.0, depends on resolution)
    let is_blurry = variance < 100.0;

    // 3. Blink Detection (Mocked for prototype)
    // In production, this would use dlib or an optimized WASM face landmark model
    let is_blinking = false;

    let result = ImageAnalysisResult {
        is_blurry,
        is_blinking,
        focus_score: variance,
    };

    Ok(serde_json::to_string(&result).unwrap())
}

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_analyzeImage<'local>(
    mut env: JNIEnv<'local>,
    _this: JObject<'local>,
    image_path: JString<'local>,
) -> jstring {
    let image_path_str: String = env.get_string(&image_path).unwrap().into();

    let result = match analyze_image(&image_path_str) {
        Ok(json) => json,
        Err(e) => format!("{{\"error\": \"{}\"}}", e),
    };

    let output = env.new_string(result).unwrap();
    output.into_raw()
}

// -------------------------------------------------------------
// BLE Beacon Scanning
// -------------------------------------------------------------

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_scanAndLinkBeacons<'local>(
    mut env: JNIEnv<'local>,
    _this: JObject<'local>,
    db_path: JString<'local>,
    clickflash_uuid: JString<'local>,
    duration_secs: jni::sys::jlong,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let uuid_str: String = env.get_string(&clickflash_uuid).unwrap().into();
    let secs = duration_secs as u64;

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(async {
        match ble::scan_clickflash_beacons(&uuid_str, secs).await {
            Ok(beacons) => {
                let mut linked_count = 0;
                for beacon_json in beacons {
                    // Queue an event to Redis Streams pipeline via local offline db
                    if enqueue_sync_event(
                        &db_path_str,
                        "ble_beacon_discovered",
                        "/api/v1/beacons/link",
                        "POST",
                        &beacon_json,
                        "high"
                    ).is_ok() {
                        linked_count += 1;
                    }
                }
                format!("{{\"status\": \"success\", \"discovered\": {}, \"linked\": {}}}", linked_count, linked_count)
            },
            Err(e) => format!("{{\"error\": \"{}\"}}", e),
        }
    });
    let output = env.new_string(result).unwrap();
    output.into_raw()
}

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_broadcastAndScanGhostLink<'local>(
    mut env: JNIEnv<'local>,
    _this: JObject<'local>,
    db_path: JString<'local>,
    ghost_link_uuid: JString<'local>,
    duration_secs: jni::sys::jlong,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let uuid_str: String = env.get_string(&ghost_link_uuid).unwrap().into();
    let secs = duration_secs as u64;

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(async {
        match ble::broadcast_and_scan_ghost_link(&uuid_str, secs).await {
            Ok(beacons) => {
                let mut linked_count = 0;
                for beacon_json in beacons {
                    // Queue an event to Redis Streams pipeline via local offline db
                    if enqueue_sync_event(
                        &db_path_str,
                        "ghost_link_discovered",
                        "/api/v1/ghost-link/proximity",
                        "POST",
                        &beacon_json,
                        "high"
                    ).is_ok() {
                        linked_count += 1;
                    }
                }
                format!("{{\"status\": \"success\", \"discovered\": {}, \"linked\": {}}}", linked_count, linked_count)
            },
            Err(e) => format!("{{\"error\": \"{}\"}}", e),
        }
    });

    let output = env.new_string(result).unwrap();
    output.into_raw()
}
