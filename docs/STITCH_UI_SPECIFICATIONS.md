# Google Stitch AI UI Design Prompts & Specifications
> ClickFlash Autonomous Concession & Resort Media Platform V7.0

This document contains standardized, high-performance prompts specifically engineered for **Google Stitch AI** (Gemini 2.5 Flash UI generator) to design and iterate on ClickFlash ecosystem interfaces.

---

## 1. Management Hub: Live Camera Fleet & WebRTC Edge Sentinel
```stitch-prompt
Screen: Real-Time Edge Sentinel & Camera Fleet Command Dashboard for Resort Concession Operator

Key Features:
- Top live telemetry bar showing: Active LAN Gateway Status (Connected 8090), Redis Ingestion FPS (48.2 fps), Edge Sync Latency (14ms), SQLite Triple-Write Health (100% Green), and Active Hot Folders.
- Main interactive 3-column Bento Grid:
  - Column 1 & 2 (Top): Live 4-camera WebRTC tile matrix (Splash Mountain Drop Cam 01, Wave Pool Roamer 04, VIP Dolphin Encounter 02, Night Parade Rover 06) with real-time FPS overlays, battery percentages, signal bars, and instant PTZ trigger buttons.
  - Column 1 & 2 (Bottom): Live Ingestion Stream showing recent capture thumbnails sliding in from left with automated sharpness score badges (e.g. 98.4%), ArcFace biometric vector match count (e.g. "3 Guests Linked"), and auto-cull approval checkmarks.
  - Column 3 (Full Height): Autonomous Revenue & Dynamic Yield Engine panel with live ticket sales graph, sleep money recovery queue ($4,820 unclaimed), WhatsApp nudge campaign dispatch rate (94.2%), and quick manual override slider for dynamic pricing.

Visual Style:
- Dark tactical theme using Deep Obsidian (#0B111F) canvas and Sub-Surface Navy (#131C31) cards.
- Vibrant Electric Cyan (#06B6D4) for primary telemetry pulses and active indicators.
- Neon Electric Violet (#8B5CF6) for AI culling algorithms and revenue indicators.
- Glassmorphic card surfaces with subtle frosted borders (1px border-white/10) and soft cyan ambient glow.

Platform: Desktop Web (1440px width), responsive to multi-monitor operations center.
```

---

## 2. Touch Kiosk: Guest Attract Screensaver & Biometric Selfie Matcher
```stitch-prompt
Screen: High-Impact Touch Kiosk Guest Attract & Biometric Photo Discovery Flow

Key Features:
- Top Header: Resort branded logo (e.g. "Atlantis Waterpark Memories") with live time, weather, and language switcher chips (English, Español, Français, Deutsch, Arabic).
- Center Hero Zone: Pulsing biometric selfie-scan circle with live camera preview frame and animated gradient border ("Look Here to Find Your Photos in 2 Seconds — Zero Paper Tickets Needed!").
- Alternative Search Options: Large icon buttons for "Scan Wristband / MagicBand (NFC/BLE)" and "Enter 4-Digit Time Estimate".
- Bottom Live Showcase Strip: High-resolution blurred preview collage of breathtaking coaster drops, water slides, and sunset family portraits with floating holographic sparkle animations.
- Prominent Footer Action: Full-width glowing Cyan pill button ("Tap Screen to Begin Instant Scan").

Visual Style:
- High-contrast Dark Luxury aesthetic with deep midnight canvas (#0B111F) and hyper-vibrant gradient accents (Cyan #06B6D4 to Violet #8B5CF6).
- Oversized, ergonomic touch targets (minimum 64px height) designed for wet hands and rapid guest turnover.
- Glassmorphic frosted modal sheets (backdrop-blur-2xl) with gentle drop shadows.

Platform: Large Format Touchscreen Kiosk (1080x1920 Portrait / 1920x1080 Landscape).
```

---

## 3. Guest Self-Service PWA: 3D Holographic Gallery & Dynamic Yield Checkout
```stitch-prompt
Screen: Mobile Guest Self-Service PWA Album Viewer and 1-Click Vacation Bundle Checkout

Key Features:
- Top Navigation: Resort concession header with "My Vacation Memory Vault (18 Photos Found)", guest selfie avatar, and currency selector ($ USD / € EUR / £ GBP).
- Hero Media Carousel: Interactive 3D Gaussian Splat preview viewer with 6-DoF orbit toggle, interactive lighting slider, and watermark overlay with dynamic discount timer ("Special Offer expires in 14:22").
- Smart Album Grid (2 columns): High-res photos grouped by ride and timestamp with one-tap favorites (heart icon), instant AI enhancement toggle (Sunlight HDR / Night Warmth), and photo size tags.
- Sticky Floating Bottom Bar: Dynamic Yield Offer pill showing "Unlock All 18 Full-Res Photos + 3D Hologram for $29.99 (Save 40%)" with Apple Pay / Google Pay / Credit Card 1-tap checkout CTA.

Visual Style:
- Fluid mobile-first glassmorphism with dark obsidian background (#0B111F) and translucent white cards (#FFFFFF10).
- High-saturation primary button in glowing Electric Cyan (#06B6D4) with active spring physics animation.
- Clean typography with high contrast (White #F8FAFC text, Slate #94A3B8 metadata).

Platform: Mobile Responsive PWA (iOS & Android, 390px–428px viewport width).
```

---

## 4. External Photographer Edge Portal: Zero-Install Hot Folder Uploader
```stitch-prompt
Screen: Freelance Photographer Zero-Install Edge Web Ingestion Portal

Key Features:
- Top Status Bar: Photographer profile badge ("John Doe — Concession Station #3"), Shift Timer (3h 42m elapsed), Total Captures Uploaded (1,240 photos), and Local LAN Ingest Gateway connection status (Port 5178).
- Drag-and-Drop Ingestion Zone: Massive dashed container accepting RAW/JPEG/HEIC files with folder watcher status ("Auto-watching E:\DCIM\100EOS5D").
- Real-time Processing Queue: Live progress list of uploaded photos showing local thumbnail, EXIF shutter speed/ISO, background sharpness benchmark score (e.g. "Sharpness: 94.2 — ACCEPTED"), and immediate biometric cluster assignment.
- Shift Leaderboard & Commission Tracker: Live commission ticker ($142.50 earned today at $0.75/unlock) with top photographer podium rankings.

Visual Style:
- Clean, utilitarian workstation layout with dark slate backdrop (#0B111F) and subtle neon cyan border strokes.
- High-visibility progress bars (Emerald Green #10B981 for synced, Amber #F59E0B for processing).
- Monospace font for telemetry and file names (JetBrains Mono).

Platform: Responsive Web (Laptop/Tablet, 1280px–1440px).
```

---

## 5. Mobile Pro App: Field Photographer Wireless Tether & Bluetooth Beacon Linker
```stitch-prompt
Screen: Mobile Pro Field Photographer Tether & BLE Guest Proximity Linking Screen

Key Features:
- Viewport / Camera Tether: Live viewfinder preview from tethered Sony Alpha / Canon R5 via Wi-Fi Direct / USB-C with histogram and shutter trigger.
- Guest Proximity Radar: Radar circle visualizing detected nearby BLE beacons and Guest PWA passes with signal strength (RSSI -42dB) and guest name tags ("Smith Family — 1.2m away").
- 1-Tap Link Bar: Big quick-action bar to attach the current burst shot to the nearest detected beacon or snap a rapid reference selfie.
- Instant Offline Sync Telemetry: Offline cache counter ("34 photos queued in Rust offline vault") with green auto-sync pulse to edge gateway.

Visual Style:
- Dark tactical interface optimized for bright outdoor daylight glare with high-contrast neon accents.
- Large thumb-accessible action buttons (60px height) arranged on lower half of screen for single-handed operation.
- Electric Cyan (#06B6D4) radar sweeps and Emerald Green (#10B981) sync confirmation badges.

Platform: Native Mobile App (iOS / Android React Native, 390px width).
```
