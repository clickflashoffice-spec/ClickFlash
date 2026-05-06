# Plan: Phase 24 - AI Smart Selection & Frictionless QR Login (v5.0 Foundation)

## 1. Problem Statement (RCA)

- **Bottleneck**: Current culling is manual or basic (score-based). Guests find room-number login slow or error-prone.
- **Goal**: Transition to "Intelligence" mode where AI does the heavy lifting of photo selection, and QR codes provide instant, secure guest access.

## 2. Technical Architecture

### A. AI Smart Culling

- **Integration**: Link `AICullingDashboard.tsx` to the backend `culling.ts` scores (Sharpness, Laplacian, Face Confidence).
- **Auto-Cull**: Implement a "Threshold-based Auto-Cull" that moves photos with <0.3 score to a "Rejected" bucket automatically.

### B. QR Frictionless Login

- **Flow**:
  1. Touch App displays a unique session QR.
  2. Guest scans with phone.
  3. Phone opens `customer-gallery` with a pre-authenticated JWT session.

### C. UX Refinement (Rule 1, Design Aesthetics)

- **Glassmorphism**: Update the culling dashboard with sleek HSL-tailored dark mode and smooth transitions.

## 3. Implementation Steps

### Task 1: AI Dashboard Polish

- [ ] Update `e:\ClickFlash\master-app\react-new\src\components\culling\AICullingDashboard.tsx`:
  - Enhance UI with high-fidelity grid.
  - Add "Auto-Apply AI Suggestions" button.

### Task 2: QR Code Service

- [ ] Create `e:\ClickFlash\touch-app\react\src\services\qrService.ts`:
  - Logic to generate unique session tokens and QR strings.
- [ ] Update Touch App UI to display Login QR.

### Task 3: Backend Linkage

- [ ] Update `e:\ClickFlash\master-app\react-new\backend\routes\culling.ts`:
  - Ensure scores are persisted to the `photos` table in the `meta` column.

## 4. Verification Plan

- **UAT**: Verify that "Run Analysis" correctly categorizes a set of blurry vs sharp photos.
- **Login Test**: Scan a generated QR and verify instant session opening in a mock browser.
