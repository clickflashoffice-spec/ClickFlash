# ClickFlash Ecosystem: Architecture & Design Strategy

## 1. UI/UX "Premium Aesthetics" (Wow Factor)
To hit the unicorn standard for photographers, the ClickFlash ecosystem needs a cohesive, premium identity that focuses on imagery while maintaining high usability.

### Design Tokens & Layout
- **Default Theme:** Dark mode by default across Web, Desktop, and Mobile. Deep purples/indigos (`#0A0A10`, `#14141E`) paired with vivid neon accents (pink/cyan) for actionable elements.
- **Glassmorphism:** Frosted glass panels (backdrop-filter blur) for navigation bars, modals, and toolbars to let the underlying high-res photography shine through.
- **Typography:** 
  - Primary (Headings): **Outfit** (geometric, modern, striking).
  - Secondary (UI/Body): **Inter** (highly legible, professional).
- **Micro-Animations:** Use framer-motion (Web) / react-native-reanimated (Mobile) to add subtle inertia to swipes, spring physics to button presses, and seamless page transitions (Hero animations for photos).

### Progressive Image Loading
- Implement **Blurhash** to show beautiful, blurry color gradients of photos before the high-res image loads, preventing layout shifts and making loading feel instant.

## 2. Architecture Resilience & Offline Capabilities

### Session Management & Rate Limiting (Cloud Backend)
- **Rate Limiting:** Implement rate limiters in Cloudflare Workers to protect the master DB and R2 endpoints.
- **Session State:** For distributed cloud services, leverage Cloudflare KV or Durable Objects for high-speed ephemeral session state, avoiding DB round-trips for auth checks.

### Isolated Resort Deployment (Offline Mode)
ClickFlash Master and Touch apps are designed to work in isolated resort networks where internet might be unavailable.
- **Local SQLite Sync:** Use `better-sqlite3` on Master. Implement an event-sourcing or CRDT (Conflict-free Replicated Data Type) pattern using `automerge` or `yjs` to synchronize state between the Master Node and Touch Kiosks over local LAN without relying on cloud servers.
- **Resilient Message Queue:** Currently using simple IPC. For robust Master <-> Touch communication, integrate a lightweight local broker (like MQTT via Aedes or ZeroMQ) within the Master app to ensure messages (like "New Photo Uploaded" or "Station Assigned") aren't lost if a Touch kiosk temporarily disconnects.
- **Queue-and-Forward:** When an isolated resort comes online, a background worker should sync local sales and uploads to the Cloudflare backend.

## 3. Advanced Features for Photographers

- **AI Auto-Culling & Quality Scoring:** Integrate local ONNX models (e.g., using `onnxruntime-node`) within the Master Electron app. Automatically group similar burst shots, flag blurred images, or detect closed eyes to save hours of manual culling.
- **Instant "Send to Phone":** Kiosks display a dynamic QR code for customers. Scanning it opens a local web server hosted by the Master app (or Cloudflare pages if online) to securely download their purchased watermarked/unwatermarked photos.
- **WebAuthn / Passkeys:** Replace password fatigue. Allow photographers to log in using FaceID/TouchID across the ecosystem.

## 4. Code Scan & Dependency Review

- We resolved over 30+ dependency misalignments (React 19 vs React 18, Expo 57, Vite).
- Consolidated to `pnpm` monorepo with `workspace:*` references, reducing node_modules bloat.
- EV Code Signing is properly orchestrated with `electron-builder` and `scripts/ev-sign.js`.

> [!NOTE] 
> Let me know if you would like me to prioritize the implementation of the **CRDT Offline Sync** or the **Glassmorphism UI Framework** next!
