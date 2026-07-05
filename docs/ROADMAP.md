# ClickFlash Strategic Roadmap (2026 - 2028)

## Phase 6: Reliability & Enterprise Hardening (Q3 2026)
- **Objective:** Ensure 99.99% uptime for cloud services and indestructible local network resilience.
- **Key Deliverables:**
  - Automated SQLite-to-D1 incremental backup system.
  - Multi-region failover for Management Hub (Cloudflare Workers).
  - Dead Letter Queue (DLQ) automated replay mechanisms.
  - Advanced telemetry and custom metrics pushing to Datadog/Sentry.

## Phase 7: Business Logic & Monetization V2 (Q4 2026)
- **Objective:** Scale the business model and capture higher MRR through automated studio onboarding.
- **Key Deliverables:**
  - Zero-touch self-service onboarding for new studios (Automated Stripe Billing + D1 tenant provisioning).
  - License key offline enforcement with 7-day grace period.
  - Granular usage tracking for the Free Tier (100 photos/mo cap enforcement).

## Phase 8: Master OS License Service & Offline Enforcement (Completed)
- [x] Create `LicenseService` to implement local checksum validation (`CF-LIVE-XXXX...`) with Salt.
- [x] Implement a 7-day grace period tracking mechanism when the internet disconnects.
- [x] Integrate `LicenseService.verifyWithHub()` inside the `CloudSyncService.sendHeartbeat()` interval to seamlessly keep license checks up to date.
- [x] Integrate license checks into key Master OS operations to lock out core features upon expiration.

## Phase 9: Mobile Expansion & Consumer Apps (Completed)
- **Objective:** Expand customer touchpoints beyond the Touch Kiosk.
- **Key Deliverables:**
  - React Native / Expo app for guests (Customer App) to view live photos via QR code scan.
  - React Native / Expo app for photographers (Staff App) to tag photos via NFC/RFID wristbands in real-time.

## Phase 9: AI & Machine Learning Enhancements (Completed)
- **Objective:** Reduce manual photographer workload by 80%.
- **Key Deliverables:**
  - On-device local LLM / Vision models for automatic blink detection, bad framing culling, and auto-color grading.
  - Facial recognition auto-grouping for families (TensorFlow.js / OpenCV integration).
  - AI-driven "upsell" recommendations on the Gallery checkout flow.

## Phase 10: Global Expansion & White-Labeling (Q3 2027)
- **Objective:** Capture international enterprise resort chains.
- **Key Deliverables:**
  - Full i18n support across Master, Touch, and Gallery.
  - Multi-currency Stripe integration with localized tax compliance (VAT, GST).
  - True White-Labeling: Custom domains, logos, and color palettes per enterprise tenant.

## Phase 11: Advanced Business Intelligence (BI) (Q4 2027)
- **Objective:** Provide unparalleled insights to studio owners.
- **Key Deliverables:**
  - Real-time heatmaps of kiosk usage.
  - Conversion rate analytics per photographer.
  - Predictive revenue forecasting based on historical season data.
