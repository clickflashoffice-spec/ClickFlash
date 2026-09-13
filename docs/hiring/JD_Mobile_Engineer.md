# Job Description: Mobile Engineer (Expo & Rust Edge)

**Company:** ClickFlash (Autonomous Photography & Resort Media Platform)
**Location:** Remote-First
**Compensation:** $140,000 - $170,000 base
**Equity:** 0.5% - 1.0% (Pre-Seed, 4-year vest, 1-year cliff)
**Reporting To:** CTO / Technical Founder

## About ClickFlash
ClickFlash is an enterprise-grade autonomous photography concession and edge-to-cloud resort media operating system. We are transforming legacy resort photography with AI-driven culling, zero-friction biometric guest linking (ArcFace 512D), and dynamic yield pricing. Our ecosystem spans 17 distinct applications from edge Master nodes to guest WebXR galleries.

## The Role
We are looking for a specialized Mobile Engineer to own our Field Photographer App (Android Pro) and Guest Photo Pass App (Consumer). ClickFlash mobile apps operate at the extreme edge: they must tether directly to DSLR cameras via USB, process data locally via Rust JNI modules, and sync seamlessly offline. 

## What You'll Do (Responsibilities)
- **Pro App Ownership:** Develop and scale our field photographer app using Expo (SDK 57), React Native, and NativeWind v5.
- **Hardware Integration:** Work with USB-OTG and PTP/gphoto2 protocols to maintain and improve direct tethering to Nikon DSLR cameras from Android devices.
- **Offline-First Data:** Ensure absolute resilience for field operations using SQLite and background sync mechanisms when Wi-Fi/LTE is unavailable.
- **Proximity Tech:** Implement and optimize BLE/UWB GATT beaconing for zero-friction guest-to-photo proximity matching.
- **Native Modules:** Interface with and expand our `clickflash-rust-core` JNI module for high-performance mobile edge tasks.

## What We're Looking For (Requirements)
- 4+ years of React Native / Expo development experience in production.
- Experience building true offline-first mobile applications (SQLite, WatermelonDB, or similar).
- Experience writing or debugging Android native modules (Java/Kotlin or JNI/Rust/C++).
- Familiarity with hardware integrations on mobile (USB OTG, Bluetooth Low Energy, or NFC).
- Strong TypeScript skills and a focus on mobile performance profiling.

## Nice-to-Haves
- Experience with Rust and JNI (Java Native Interface).
- Familiarity with camera communication protocols (PTP, MTP).
- Experience integrating Stripe Terminal (mPOS) on mobile.
- Background in photography or understanding of DSLR hardware.

## Why Join Us
You won't be building another generic CRUD app. You will be pushing the limits of what mobile devices can do at the edge—tethering to professional cameras, communicating locally via BLE, and running high-performance rust binaries, all while photographers rely on your app in harsh field conditions (beaches, theme parks).
