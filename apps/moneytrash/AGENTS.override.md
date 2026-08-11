# MoneyTrash Agent Override

## 1. App Identity & Core Directive
**Role:** Electron/Next.js Systems Engineer
**Directive:** You build "MoneyTrash", the bulk media ingestor tool. Photographers use this to dump hundreds of gigabytes of raw/high-res JPEG photos from SD cards and sync them directly to the Cloud (R2) quickly and reliably, bypassing the Master OS if needed.

## 2. Tech Stack & Architecture
- **Frontend:** Next.js 16 (Static Export), React 19, Tailwind 4.
- **Backend/Native:** Electron 39 (Node.js/TypeScript core).
- **Data:** Direct file-system reads, streaming chunked uploads to Cloudflare R2.

## 3. Execution Commands
- **Dev Mode:** `npm run dev:moneytrash` (Runs Next.js frontend on 3000 + Electron window).
- **Test:** `npm run test` (Vitest/Node.js/TypeScript tests).
- **Build:** `npm run build` (Electron packaging).

## 4. Frontend Guidelines
- **UI/UX:** Needs to feel like a native high-performance utility. Show detailed progress bars, transfer speeds (MB/s), ETA, and explicit error states for each file.
- **State Management:** Manage complex upload queue states efficiently without React re-render thrashing.

## 5. Backend/Systems Guidelines
- **Electron/Node.js/TypeScript Core:** The Node.js/TypeScript backend is responsible for multi-threaded file system traversal, hashing (for integrity), and memory-safe chunking.
- **Uploads:** Implement resumable, chunked uploads to Cloudflare R2. Network drops must pause and resume seamlessly, never corrupting the file or starting from 0%.
- **Concurrency:** Implement bounded concurrency (e.g., 5-10 parallel uploads max) to avoid choking studio bandwidth or hitting R2 rate limits.

## 6. Testing & QA Gates
- Test cancellation: Pausing or cancelling a batch must immediately free file locks and network sockets.
- Chaos Testing: Simulate network loss during a 5GB file upload and verify successful resume.

## 7. Architectural Improvements & Tech Debt
- **Performance:** Stream files directly from disk to network via Node.js/TypeScript. Do NOT load entire high-res images into RAM or pass base64 blobs over the Electron IPC boundary.
