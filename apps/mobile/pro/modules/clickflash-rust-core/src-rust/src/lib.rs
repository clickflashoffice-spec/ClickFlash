use jni::JNIEnv;
use jni::objects::{JClass, JString};
use jni::sys::jstring;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STD};

type HmacSha256 = Hmac<Sha256>;

use rusqlite::{Connection, Result as SqlResult};

// -------------------------------------------------------------
// Core Engine Functions
// -------------------------------------------------------------

/// Saves a booking to the local offline SQLite database
fn save_booking(db_path: &str, name: &str, whatsapp: &str, email: &str) -> Result<String, String> {
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            whatsapp TEXT,
            email TEXT,
            status TEXT NOT NULL
        )",
        (), // empty list of parameters
    ).map_err(|e| format!("Failed to create table: {}", e))?;

    conn.execute(
        "INSERT INTO bookings (name, whatsapp, email, status) VALUES (?1, ?2, ?3, ?4)",
        (name, whatsapp, email, "pending"),
    ).map_err(|e| format!("Failed to insert booking: {}", e))?;

    Ok("Booking saved offline successfully".to_string())
}

#[derive(serde::Serialize)]
struct BookingPayload<'a> {
    id: i32,
    name: &'a str,
    whatsapp: &'a str,
    email: &'a str,
}

/// Syncs all pending bookings to the Master Node and updates status to 'synced'
async fn sync_pending_bookings(db_path: &str, master_url: &str) -> Result<String, String> {
    let mut conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let tx = conn.transaction().map_err(|e| format!("Tx failed: {}", e))?;

    // We collect the updates needed and execute them after the network request.
    // In a real production app, we would process them in batches.
    let mut stmt = tx.prepare("SELECT id, name, whatsapp, email FROM bookings WHERE status = 'pending'")
        .map_err(|e| format!("Prepare failed: {}", e))?;
    
    // Read them all into memory for the POST
    let mut pending_bookings = Vec::new();
    {
        let mut rows = stmt.query([]).map_err(|e| format!("Query failed: {}", e))?;
        while let Some(row) = rows.next().unwrap_or(None) {
            let id: i32 = row.get(0).unwrap_or(0);
            let name: String = row.get(1).unwrap_or_default();
            let whatsapp: String = row.get(2).unwrap_or_default();
            let email: String = row.get(3).unwrap_or_default();
            pending_bookings.push((id, name, whatsapp, email));
        }
    }

    if pending_bookings.is_empty() {
        return Ok("0 bookings pending sync".to_string());
    }

    // Build the JSON payload manually or with serde_json
    let mut payload = Vec::new();
    for b in &pending_bookings {
        payload.push(serde_json::json!({
            "id": b.0,
            "name": b.1,
            "whatsapp": b.2,
            "email": b.3
        }));
    }

    let client = reqwest::Client::new();
    let res = client.post(master_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if res.status().is_success() {
        // Mark all as synced
        for b in &pending_bookings {
            tx.execute("UPDATE bookings SET status = 'synced' WHERE id = ?1", [b.0])
                .unwrap_or(0);
        }
        tx.commit().unwrap_or(());
        Ok(format!("Successfully synced {} bookings", pending_bookings.len()))
    } else {
        Err(format!("Master Node rejected payload. Status: {}", res.status()))
    }
}

// -------------------------------------------------------------
// JNI (Android) Bindings
// -------------------------------------------------------------

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_saveBooking(
    mut env: JNIEnv,
    _class: JClass,
    db_path: JString,
    name: JString,
    whatsapp: JString,
    email: JString,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let name_str: String = env.get_string(&name).unwrap().into();
    let whatsapp_str: String = env.get_string(&whatsapp).unwrap().into();
    let email_str: String = env.get_string(&email).unwrap().into();

    let result = match save_booking(&db_path_str, &name_str, &whatsapp_str, &email_str) {
        Ok(msg) => msg,
        Err(e) => format!("ERROR: {}", e),
    };

    let output = env.new_string(result).unwrap();
    output.into_raw()
}

#[no_mangle]
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_syncPendingBookings(
    mut env: JNIEnv,
    _class: JClass,
    db_path: JString,
    master_url: JString,
) -> jstring {
    let db_path_str: String = env.get_string(&db_path).unwrap().into();
    let master_url_str: String = env.get_string(&master_url).unwrap().into();

    // Use tokio runtime to block on the async sync task
    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(async {
        match sync_pending_bookings(&db_path_str, &master_url_str).await {
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
pub extern "system" fn Java_com_clickflash_mobilepro_ClickFlashRustCoreModule_analyzeImage(
    mut env: JNIEnv,
    _class: JClass,
    image_path: JString,
) -> jstring {
    let image_path_str: String = env.get_string(&image_path).unwrap().into();

    let result = match analyze_image(&image_path_str) {
        Ok(json) => json,
        Err(e) => format!("{{\"error\": \"{}\"}}", e),
    };

    let output = env.new_string(result).unwrap();
    output.into_raw()
}
