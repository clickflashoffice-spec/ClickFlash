# ClickFlash Ecosystem V8.0: The Omni-Modal Autonomous Roadmap

This document outlines the master blueprint for evolving ClickFlash into the world's most advanced, zero-friction photography and 3D media ecosystem, crushing competitors like DEI, Pomvom, Disney PhotoPass, and Fotiqo.

## Phase 1: Omni-Modal Foundation & Headless Edge
**Goal:** Transition from a UI-heavy monolith to a Fotiqo-style centralized Management Hub, reducing the Master App to a pure, headless edge-processing node.
- [x] **Management Hub Initialization**: Scaffold `apps/management` with Tremor and Shadcn UI.
- [x] **Headless Master Strip-down**: Remove bloated UI (Albums, Editors, Bookings) from `apps/desktop/master` and expose state strictly via API/Redis.
- [x] **Live Gallery Preview**: Provide 1:1 iframe overlays in the Management Hub for executives to see exactly what customers see, and trigger AI actions.
- [x] **Customer Galleries Oversight (Better Than Fotiqo)**: Integrate deep, interactive customer gallery oversight in the Management Hub, allowing seamless preview of customer photos, AI-assisted upsells, and granular album control without ever leaving the dashboard.
- [x] **Redis Streams / Kafka Ingestion**: Deprecate direct SQLite inserts for photo ingestion. `apps/master` routes will push high-throughput events to Redis Streams.
- [x] **WebRTC Command Hub**: Establish a signaling server in `apps/master`. Allow the `apps/management` Command Center to open 2-way WebRTC video/audio feeds with field photographers.

## Phase 2: Zero-Friction "Invisible" Linking & Delivery
**Goal:** Eliminate QR codes and barcodes. Link photos to guests implicitly and deliver them seamlessly.
- [x] **Biometric Selfie-First Engine**: Build the guest onboarding flow in `apps/gallery` to capture a selfie.
- [x] **Vector Database Integration**: Sync selfies to a Vector DB (Qdrant/Milvus). Process all incoming photos to extract face embeddings and link them automatically in <2 seconds.
- [x] **UWB / BLE Proximity Nets**: Equip `apps/mobile-consumer` with BLE beacon broadcasting. Install fixed edge-cameras that detect BLE UUIDs and auto-link high-speed ride photos.
- [x] **WhatsApp Magic Link Delivery**: Instead of forcing account creation, send a secure, passwordless magic link to the guest's WhatsApp and Email the moment their gallery is ready.

## Phase 3: Swarm Intelligence & The Revenue Engine
**Goal:** Maximize yield and operational efficiency via AI management and aggressive CRM automations.
- [x] **WhatsApp Sales Swarm**: Implement `AnalystAgent`, `CloserAgent`, and `NegotiatorAgent` to actively hunt "Hot Leads" and recover abandoned checkouts.
- [x] **Infinite 360° Loop**: Continuous recursive execution pipeline that deploys swarm agents to fix gaps until the codebase is 100% production ready.
- [x] **Dynamic Yield Pricing**: Cloud engine that shifts digital download prices based on time-of-day, weather, and real-time park crowd density.
- [x] **AI Photographer Dispatch (HotspotAgent)**: Predict high-demand "hot zones" and push notifications to photographer apps.
- [x] **Fraud & Compliance Monitoring (SpyAgent)**: Analyze POS vs. Cash trails and monitor hardware health automatically.

## Phase 4: AI Media Generation (Reels & 3D)
**Goal:** Replace human editing workflows with intelligent algorithms that generate premium media.
- [x] **AI Auto-Culling & Hero Curation (MoneyTrash AI)**: Implement a VLM worker to rescue emotionally valuable but technically imperfect photos rejected by the Laplacian Variance filter.
- [x] **Unsold Photos Batch Analyzer**: Introduce an automated analyzer in MoneyTrash to scan unsold photos periodically, determining AI salvageability, triggering discounts via the WhatsApp Sales Swarm, and discarding truly unsalvageable media to save storage.
- [x] **Generative Auto-Enhance**: Algorithmically detect lighting conditions to apply cinematic grading, sky replacements, and noise reduction.
- [x] **Beat-Matched Reels & Slideshows**: A rendering pipeline that curates the day's best shots, applies Ken Burns effects, and syncs transitions to licensed music. Outputs 9:16 (TikTok) and 16:9 MP4s.
- [x] **AI 2D-to-3D Generation**: Send high-res 2D guest photos to a generative AI pipeline (e.g., Meshy AI) to autonomously construct watertight `.OBJ`/`.STL` 3D meshes and textures without needing physical scanning booths.
- [x] **AR Digital Avatars**: Process the scans into lightweight 3D models viewable directly in `apps/mobile-consumer` via WebGL/ARKit.
