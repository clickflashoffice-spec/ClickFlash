# 120-Domain Remediation Implementation Plan

## Scope

Implement and verify Phases 2-4 from the attached one-time ecosystem remediation roadmap. Preserve unrelated worktree changes and do not deploy, migrate production data, sign, commit, or push without explicit approval.

## Phase 2 — AI and grading

- [x] Strict finite, non-zero L2 normalization for Master and Touch vector indexes.
- [x] Typed Gemini retry policy for 429/5xx, full jitter, and numeric/HTTP-date `Retry-After`.
- [x] MoneyTrash ROI grading with HSV/YCbCr skin detection, 8-neighbor Laplacian, and RAW embedded-preview extraction.
- [x] Magic Eraser native-resolution mask export with coordinate scaling and alpha thresholding.
- [x] Focused Phase 2 tests and affected-target typechecks.

## Phase 3 — edge, LAN, Wallet, and mobile

- [x] Rust/Wasm sharpness and bicubic resize package with SIMD implementation and TypeScript fallback integration.
- [x] Cloud R2 HTTP Range semantics and optional KV-backed gallery QR sessions.
- [x] Touch WebRTC data-channel transfer with signaling, backpressure, timeout, and LAN fallback.
- [x] Apple Wallet QR, PDF417, and Aztec barcode array with UTF-8 encoding.
- [x] Consumer mobile interactive SVG hotspot map with gestures, safe areas, and live telemetry pins.
- [x] Focused Phase 3 tests and affected-target typechecks.
- [x] Native Rust tests and optimized `wasm32-unknown-unknown` release build.

## Phase 4 — Gallery checkout and large-gallery UX

- [x] Stripe Elements `PaymentElement` with `night` appearance tokens.
- [x] Two-step mobile checkout wizard with sticky action footer.
- [x] Hoisted react-window v2 grid cell renderer and velocity-adjusted overscan.
- [x] Photo skeleton shimmer grid and actionable filtered/no-content empty states.
- [x] Focused Gallery tests and strict Gallery typecheck.
- [ ] Full Gallery suite and lint compatibility gate.

## Final verification

- [ ] `npm run typecheck:all`
- [ ] Master, Touch, Management, and Gallery test suites
- [ ] `npm run lint:all`
- [ ] `npm run build:all`
- [ ] `git diff --check` and scoped diff review
- [ ] Exact results recorded in `.agents/session-state.md`
