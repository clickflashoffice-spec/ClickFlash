# Data Flows & Boundary Protocols — ClickFlash V7.0

## 1. Zero-Friction Edge Ingestion & Biometric Pairing Flow

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Resort Guest
    actor FieldPhotog as Field Photographer
    participant Camera as DSLR / Mirrorless
    participant MobilePro as apps/mobile-pro
    participant MasterOS as apps/master (Port 8090)
    participant VPTree as In-Memory VP-Tree
    participant SQLite as Local SQLite (WAL)
    participant CloserSwarm as Closer Swarm Agent
    participant WhatsApp as WhatsApp Cloud API

    FieldPhotog->>Camera: Trigger Shutter (Burst Mode)
    Camera->>MobilePro: Transfer RAW/JPEG via USB-OTG (PTP/IP)
    MobilePro->>MobilePro: Compute on-device Sharpness Score (Rust Core)
    MobilePro->>MasterOS: Stream JPEG + EXIF via LAN Fastify POST /api/photos/upload
    MasterOS->>SQLite: Insert Photo record (Status: INGESTED)
    MasterOS->>MasterOS: Extract 512D ArcFace Vector (ONNX Worker)
    MasterOS->>VPTree: Insert Vector into VP-Tree Node
    
    Note over Guest,WhatsApp: Guest Uploads Selfie via Touch Kiosk or QR PWA
    Guest->>MasterOS: Submit Selfie Image
    MasterOS->>MasterOS: Compute Selfie 512D ArcFace Embedding
    MasterOS->>VPTree: Query nearest neighbors (threshold: 0.8366 cosine)
    VPTree-->>MasterOS: Return matched photoIds [photo_101, photo_102, ...]
    
    MasterOS->>CloserSwarm: Trigger Closer Agent with matched count
    CloserSwarm->>CloserSwarm: Format Personalized WhatsApp Pitch with Magic Link
    CloserSwarm->>WhatsApp: POST /v17.0/messages (Interactive Button Template)
    WhatsApp-->>Guest: Deliver WhatsApp Message with Instant Album Link
```

---

## 2. Dynamic Negotiation & WhatsApp Counter-Offer Flow

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Resort Guest
    participant WhatsApp as WhatsApp Cloud API
    participant MasterOS as apps/master Webhook
    participant Negotiator as NegotiatorAgent (Gemini 2.0)
    participant Stripe as Stripe Checkout
    participant Gallery as apps/gallery

    WhatsApp->>MasterOS: Webhook: Guest replies "That is too expensive for 5 photos"
    MasterOS->>Negotiator: handleIncomingReply(from, message, history)
    Negotiator->>Negotiator: Analyze message sentiment & photo aiSalvageScore
    Negotiator->>Negotiator: Generate counter-offer ($39 -> $24.99 with code SAVE35)
    Negotiator->>WhatsApp: Send reply: "We hear you! Use code SAVE35 for $24.99"
    WhatsApp-->>Guest: Display Counter-Offer Message
    Guest->>Gallery: Open Magic Link & Apply Code SAVE35
    Gallery->>Stripe: Create Payment Intent ($24.99)
    Stripe-->>Gallery: Payment Authorized
    Gallery-->>Guest: Unlock Full-Resolution Watermark-Free Downloads
```

---

## 3. Generative 3D Figurine & Print Farm Fulfillment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Resort Guest
    participant Gallery as apps/gallery (Three.js)
    participant CloudBackend as Cloudflare Worker
    participant AIWorker as AI 3D Worker (Neural4D)
    participant R2 as Cloudflare R2
    participant PrintFarm as 3D Print Fulfillment Partner

    Guest->>Gallery: Select photo & click "Create 3D Figurine"
    Gallery->>CloudBackend: POST /api/3d/generate (photoId)
    CloudBackend->>AIWorker: Dispatch 2D-to-3D Reconstruction Task
    AIWorker->>AIWorker: Estimate Depth, Segment Foreground, Generate Mesh
    AIWorker->>AIWorker: Validate Watertight Geometry & Fix Non-Manifold Edges
    AIWorker->>R2: Upload preview .GLB & full-res .STL
    AIWorker-->>CloudBackend: Return GLB URL & mesh statistics
    CloudBackend-->>Gallery: Return 3D Asset
    Gallery->>Gallery: Render interactive 3D Holographic Viewer (WebGL/Three.js)
    Guest->>Gallery: Order Physical 6-inch Color Sandstone Figurine ($79)
    Gallery->>CloudBackend: Complete Stripe Checkout
    CloudBackend->>PrintFarm: Webhook: Dispatch STL + Guest Shipping Address
    PrintFarm-->>Guest: Print & Drop-Ship Figurine in 3-5 Days
```
