# Interview Rubric: Mobile Engineer (Expo / React Native / Rust) (🟡 P1)

> **Role Focus:** Field photographer Android Pro App (`apps/mobile/pro`), USB-OTG DSLR camera tethering, offline SQLite write queue, BLE proximity beacons, and guest Consumer Pass (`apps/mobile/consumer`).

---

## 1. Evaluation Dimensions (Score 1 to 5)

| Dimension | Weight | Poor (1–2) | Target (3–4) | Exceptional (5) |
|:---|:---|:---|:---|:---|
| **React Native & Expo Ecosystem** | 25% | Relies entirely on managed Expo without understanding native bridges or prebuild configs. | Fluent with Expo SDK 57+, custom dev clients, NativeWind styling, and New Architecture (TurboModules / Fabric). | Writes high-performance native modules (JNI/Kotlin/Swift), handles memory leaks in image caching, and profiles Hermes engine. |
| **Hardware & USB-OTG Camera Tethering** | 30% | Has never connected an external peripheral over USB to an Android device. | Experience handling Android USB permissions, intent filters, PTP/MTP device descriptors, and continuous photo streaming. | Expert in bulk USB transfer buffers, protocol timeouts, battery-saving OTG power negotiation, and camera status polling. |
| **Offline-First & Local Storage Sync** | 25% | Assumes continuous Wi-Fi connection; sync crashes on dropped packets. | Implements resilient offline queues (SQLite/WatermelonDB/OP-SQLite) with exponential backoff and conflict resolution. | Designs immutable append-only event logs, delta sync via WebSockets/Redis Streams, and zero-data-loss guarantees under power pull. |
| **BLE & Proximity Protocols** | 20% | Superficial beacon scanning; drains device battery in $<2$ hours with unthrottled scanning. | Implements background BLE scanning/advertising, RSSI filtering, and beacon proximity zoning. | Optimizes AltBeacon/iBeacon duty cycles; implements kalman filtering for RSSI smoothing and accurate distance estimation. |

---

## 2. Practical Technical Assessment (Paid Take-Home / 48 Hours)

### Challenge: "Resilient Offline Camera Ingest & BLE Proximity Tagging"
- **Objective:** Create a sample React Native / Expo app demonstrating:
  1. A background event queue that simulates receiving photo files from an OTG cable while completely offline.
  2. Local persistence in SQLite with metadata (timestamp, file size, fake camera serial number).
  3. Continuous BLE scanning that tags incoming photos with the nearest active beacon ID (RSSI $> -70\text{ dBm}$).
  4. Auto-reconnection logic: When a simulated LAN server comes online, upload the queue in batches of 5 with retry tokens, ensuring zero duplicated records.
- **Evaluation Criteria:**
  - Battery consumption and background execution hygiene on Android.
  - Graceful handling of USB disconnection mid-transfer.
  - Clean TypeScript types and modular separation between UI and hardware services.

---

## 3. Decision Matrix
- **Hire (Score $\ge 4.0/5$):** Understands the harsh realities of mobile edge hardware; writes bulletproof offline sync logic.
- **No Hire (Score $< 3.5/5$):** Only comfortable building standard consumer REST API screens; cannot debug Android native bridges.
