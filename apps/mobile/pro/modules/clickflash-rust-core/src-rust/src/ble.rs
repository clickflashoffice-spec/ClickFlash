use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::{Manager, Peripheral};
use std::error::Error;
use std::time::Duration;
use tokio::time;
use uuid::Uuid;
use serde_json::json;

/// Scans for BLE beacons matching the ClickFlash UUIDs and returns a list of discovered devices
pub async fn scan_clickflash_beacons(clickflash_uuid_str: &str, scan_duration_secs: u64) -> Result<Vec<String>, Box<dyn Error>> {
    let manager = Manager::new().await?;
    let adapters = manager.adapters().await?;
    let central = adapters.into_iter().nth(0).ok_or("No Bluetooth adapters found")?;

    let mut filter = ScanFilter::default();
    if let Ok(uuid) = Uuid::parse_str(clickflash_uuid_str) {
        filter.services.push(uuid);
    }

    central.start_scan(filter).await?;
    println!("Scanning for ClickFlash BLE beacons for {} seconds...", scan_duration_secs);

    time::sleep(Duration::from_secs(scan_duration_secs)).await;

    central.stop_scan().await?;

    let mut discovered = Vec::new();
    for peripheral in central.peripherals().await? {
        let properties = peripheral.properties().await?.unwrap_or_default();
        let is_match = properties.local_name.as_ref().map(|n| n.contains("ClickFlash")).unwrap_or(false)
            || properties.services.iter().any(|u| u.to_string() == clickflash_uuid_str);
            
        if is_match {
            let addr = peripheral.address().to_string();
            let rssi = properties.rssi.unwrap_or(0);
            let name = properties.local_name.unwrap_or_default();
            
            let beacon_data = json!({
                "address": addr,
                "name": name,
                "rssi": rssi,
                "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()
            });
            
            discovered.push(beacon_data.to_string());
        }
    }

    Ok(discovered)
}

/// Calculates a confidence score (0.0 to 1.0) based on RSSI and TxPower
pub fn calculate_confidence(rssi: i32, tx_power: i32) -> f32 {
    if rssi == 0 { return 0.0; }
    if rssi >= tx_power { return 1.0; }
    let diff = (tx_power - rssi).abs() as f32;
    let confidence = 1.0 - (diff / 30.0);
    if confidence < 0.0 { 0.0 } else { confidence }
}

/// Simulates broadcasting a Ghost-Link UUID and then scans for nearby devices emitting it
pub async fn broadcast_and_scan_ghost_link(ghost_link_uuid_str: &str, scan_duration_secs: u64) -> Result<Vec<String>, Box<dyn Error>> {
    println!("Broadcasting Ghost-Link payload {} for {} seconds...", ghost_link_uuid_str, scan_duration_secs);
    
    // In Rust, btleplug has limited support for the Peripheral (broadcast) role.
    // We simulate the time spent broadcasting, then fall through to scanning.
    // In a real device environment, this might be handled by Swift/Kotlin side or a specific daemon.
    
    // We can also just run the scan concurrently. For now, we will perform a scan for the target UUID.
    let manager = Manager::new().await?;
    let adapters = manager.adapters().await?;
    let central = adapters.into_iter().nth(0).ok_or("No Bluetooth adapters found")?;

    let mut filter = ScanFilter::default();
    if let Ok(uuid) = Uuid::parse_str(ghost_link_uuid_str) {
        filter.services.push(uuid);
    }

    central.start_scan(filter).await?;
    println!("Scanning for Ghost-Link BLE beacons for {} seconds...", scan_duration_secs);

    time::sleep(Duration::from_secs(scan_duration_secs)).await;

    central.stop_scan().await?;

    let mut discovered = Vec::new();
    for peripheral in central.peripherals().await? {
        let properties = peripheral.properties().await?.unwrap_or_default();
        let is_match = properties.services.iter().any(|u| u.to_string() == ghost_link_uuid_str);
            
        if is_match {
            let addr = peripheral.address().to_string();
            let rssi = properties.rssi.unwrap_or(0);
            let name = properties.local_name.unwrap_or_default();
            
            let beacon_data = json!({
                "address": addr,
                "name": name,
                "rssi": rssi,
                "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis(),
                "payload_type": "ghost-link"
            });
            
            discovered.push(beacon_data.to_string());
        }
    }

    println!("Ghost-Link broadcast/scan complete. Found {} devices.", discovered.len());
    Ok(discovered)
}
