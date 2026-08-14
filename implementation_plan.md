# ClickFlash Implementation Plan

## Goal Description
Implement the "Headless Master" and "Fotiqo-Style Management Hub" architecture. Centralize all operational visibility to the cloud/hub while enabling multi-agent AI features (WhatsApp Sales Swarm, MoneyTrash Grader).

## Status: ACTIVE EXECUTION

### Phase 1: Headless Master & Management Hub UI (COMPLETED)
- [x] Strip `Albums`, `Photographers`, `Studio Editor` from Master UI.
- [x] Wire Management Hub `GalleriesView` to fetch data from Master via `apiService`.
- [x] Implement Fotiqo-style "Live Gallery Preview" modal in Management Hub.
- [x] Build out Tremor KPI Bento Boxes for tracking WhatsApp AI Upsells in Management Hub.

### Phase 2: WhatsApp Webhook & Swarm Integration (UPCOMING)
- [ ] Connect Ngrok locally to test Meta WhatsApp Webhooks (`test-orchestrator.ts`).
- [ ] Ensure `AnalystAgent`, `CloserAgent`, and `NegotiatorAgent` effectively trigger off local `CustomerEngagementRecord` events.

### Phase 3: MoneyTrash VLM AI Grader (UPCOMING)
- [ ] Build the `ai-grade-worker.ts` in `apps/desktop/moneytrash`.
- [ ] Integrate Gemini-1.5-Pro Vision to override the Laplacian Variance filter for highly-emotional (but slightly blurry) photos.

### Phase 4: Mobile Pro Rust Core Scaffold (UPCOMING)
- [ ] Initialize `clickflash-rust-core` module inside `apps/mobile/pro`.
- [ ] Bind JNI/Swift bridging for off-thread SQLite syncing and BLE telemetry.

## User Review Required
No immediate user review required; continuing on execution of Phase 2 and 3 based on established Fotiqo-competitor requirements.

## Verification Plan
1. Run `npm run typecheck:all` to ensure no UI stripping broke dependencies.
2. Ensure the Live Gallery Preview iframe loads the `apps/gallery` port correctly.
3. Test the WhatsApp Webhook flow end-to-end via ngrok payload simulation.
