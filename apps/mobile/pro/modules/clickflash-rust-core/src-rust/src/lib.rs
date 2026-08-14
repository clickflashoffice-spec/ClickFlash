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
