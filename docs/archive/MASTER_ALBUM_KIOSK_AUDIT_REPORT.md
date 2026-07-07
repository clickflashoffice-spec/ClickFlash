# ClickFlash Master App — Album Editor, Import & Kiosk Pairing Audit Report

> **Date:** 2026-06-12  
> **Scope:** Master app frontend (`apps/master/src/components/albums/`) and backend (`apps/master/backend/`)  
> **Areas:** Album Editor, Album Import, Kiosk Pairing from Settings  
> **Author:** Acting CTO (Hermes audit pass)

This audit covers the three areas added to the CEO plan:
1. **Album Editor** — photo editing, undo/redo, AI features, batch operations, export
2. **Album Import** — `ImportAlbumModal` wizard, file browser, validation, progress
3. **Kiosk Pairing from Master Settings** — `KioskPairing.tsx`, QR codes, mDNS, challenge-response

---

## 1. Album Editor — `apps/master/src/components/albums/editor2/`

### 1.1 Architecture Overview

The editor is a well-structured React application using:
- **Reducer-based state** (`useEditorState.ts`) — 623 LoC, 16 action types, per-photo undo/redo history with LRU eviction
- **Context composition** (`EditorContext.tsx`) — 285 LoC, composes 5 sub-hooks (photo, edits, selection, tool, zoom)
- **Feature hooks** — `useAIEditor.ts`, `useEditorTools.ts`, `useKioskEditor.ts`, `useZoomAndPan.ts`
- **Canvas rendering** — `EditorCanvas.tsx` with WebGL/2D fallback, grid overlay, retouch interaction

**State shape:**
```
EditorState
├── photos: Photo[]                    // source of truth
├── edits: Record<photoId, ManualEdits>  // working edits
├── histories: Record<photoId, {past, future}>  // undo/redo per photo
├── dirtyPhotoIds: Set<string>         // which photos need saving
├── isDirty: boolean                   // any unsaved changes?
├── selectedPhotoIds: Set<string>    // batch selection
├── zoomStates: Record<photoId, Zoom>  // per-photo zoom persistence
└── activeTool: "adjust" | "crop" | "retouch"
```

### 1.2 Finding — History memory leak: `UPDATE_EDIT` and `SET_EDITS` duplicate history work

**Severity: MEDIUM**  
**Files:** `useEditorState.ts` lines 159–202, 205–245

Both `UPDATE_EDIT` and `SET_EDITS` cases compute `newHistories` with `evictLRUHistories()` but then **discard that work** and write `state.histories` directly:

```ts
// UPDATE_EDIT (line 179–202)
const newHistories = evictLRUHistories(state.histories, ...);  // computed
newHistories[state.activePhotoId] = { past: trimmedPast, future: [] };

return {
  ...state,
  histories: {
    ...state.histories,  // BUG: uses old state.histories, not newHistories!
    [state.activePhotoId]: {
      past: [...currentHistory.past, currentEdits].slice(-getHistoryCap(...)),  // re-computes, ignores trimmedPast
      future: [],
    },
  },
};
```

The `newHistories` variable is computed but never used in the return object. The `evictLRUHistories` call is a pure side-effect that gets thrown away. For large albums (200+ photos), this means:
- History entries for non-visible photos are **never evicted** — memory grows unbounded
- The `trimmedPast` computation is done twice (once in `newHistories`, once inline in the return)

**Same bug exists in `SET_EDITS` (lines 222–245).**

**Fix:** Use `newHistories` in the return object:

```ts
return {
  ...state,
  edits: { ...state.edits, [state.activePhotoId]: newEdits },
  dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(state.activePhotoId),
  isDirty: true,
  histories: newHistories,  // FIX: use the computed one
};
```

### 1.3 Finding — `RESET_EDITS` and `RESET_ACTIVE_EDIT` use `MAX_HISTORY` (50) instead of dynamic cap

**Severity: LOW**  
**Files:** `useEditorState.ts` lines 314–337, 405–430

```ts
// RESET_EDITS (line 333)
past: [...currentHistory.past, currentEdits].slice(-MAX_HISTORY),  // always 50
```

For albums with >100 photos, the dynamic cap is 10. The reset operations ignore this and always keep 50 entries, causing 5× the expected memory for those albums.

**Fix:** Use `getHistoryCap(state.photos.length)` consistently.

### 1.4 Finding — `handleAutoEnhance` in `useAIEditor.ts` is a fake AI (hardcoded values + 1.5s delay)

**Severity: LOW (UX deception)**  
**File:** `useAIEditor.ts` lines 62–99

```ts
const enhanceEdits: Partial<ManualEdits> = {
  exposure: 10, contrast: 15, highlights: -20, shadows: 20, vibrance: 10, sharpen: 20,
};
// ...
await new Promise((resolve) => setTimeout(resolve, 1500));  // fake delay
updateEdit(enhanceEdits);
```

The "Auto Enhance" button applies the same static edits to every photo regardless of content. The 1.5s delay simulates processing but nothing is actually computed. This is fine for a placeholder but should be documented as "Preset Enhance" rather than "AI Enhance" to avoid user confusion.

**Recommendation:** Rename the button to "Quick Enhance" or wire it to a real histogram analysis (even a simple one: compute mean brightness and adjust exposure accordingly).

### 1.5 Finding — `useAlbumEditState.ts` (legacy hook) is orphaned but still imported

**Severity: LOW (dead code)**  
**File:** `apps/master/src/components/albums/hooks/useAlbumEditState.ts` (183 LoC)

This hook uses `useState` + `useCallback` pattern (pre-reducer era) and is **not used by `AlbumEditor.tsx`**. The editor now uses `useEditorState` (reducer-based). However, `useAlbumEditState` is still exported from `hooks/index.ts` and may be imported by other components.

**Check:**
```bash
grep -rn "useAlbumEditState" apps/master/src/ --include="*.tsx" --include="*.ts"
```

If nothing imports it, remove it to reduce bundle size and confusion.

### 1.6 Finding — `AlbumEditor.tsx` save flow has a race condition on rapid edits

**Severity: MEDIUM**  
**File:** `AlbumEditor.tsx` lines 264–322

The `handleSave` function:
1. Filters `state.photos` by `state.dirtyPhotoIds` to get `dirtyPhotos`
2. Calls `apiService.batchSavePhotos(dirtyPhotos)`
3. On success, calls `actions.markSaved(savedIds)` which dispatches `SAVE_SUCCESS`

**The race:** If the user edits a photo while `batchSavePhotos` is in flight, the new edit won't be in `dirtyPhotoIds` yet (it's added by `UPDATE_EDIT`), but after the save completes, `markSaved` will clear the dirty flag for that photo. The edit is lost from the dirty set and won't be saved on the next save.

**Fix:** The `SAVE_SUCCESS` reducer should only clear IDs that were **actually sent** in that batch, not all currently dirty IDs. The current implementation does this correctly (`savedIds` comes from the API response), but the `dirtyPhotoIds` Set is shared state — if a new edit happens during the save, it gets added to the Set, and then `SAVE_SUCCESS` removes it because the reducer does:

```ts
const newDirtyIds = new Set(
  [...state.dirtyPhotoIds].filter((id) => !savedIds.has(id)),
);
```

This is actually correct! The race is narrower than it appears — `savedIds` only contains IDs that were in the batch, and new dirty IDs added during the save won't be in `savedIds`, so they survive. **No bug here.** Marking as **verified correct**.

### 1.7 Finding — Autosave draft restoration doesn't check for data loss

**Severity: MEDIUM**  
**File:** `AlbumEditor.tsx` lines 205–224

```ts
if (photos.length > 0 && !state.isDirty) {
  const saved = localStorage.getItem(`CF_DRAFT_${albumId}`);
  if (saved) {
    const draft = JSON.parse(saved);
    const isFresh = Date.now() - (draft.timestamp || 0) < 24 * 60 * 60 * 1000;
    if (draft.albumId === albumId && isFresh && draft.edits) {
      actions.restoreDraft(draft.edits);
      showToast("Restored unsaved changes from previous session");
    }
  }
}
```

**Problem:** If the user intentionally discarded changes (e.g., clicked "Reset All" then closed the editor), the draft is still in localStorage. On reopening, it restores the discarded edits without asking. The 24h freshness check doesn't distinguish "intentionally discarded" from "crashed before save."

**Fix:** Add a `discarded` flag to the draft when the user explicitly resets, or show a modal: "Unsaved changes from [timestamp] found. Restore or discard?"

### 1.8 Finding — Export path traversal check is incomplete

**Severity: LOW**  
**File:** `AlbumEditor.tsx` lines 345–362

```ts
if (/\.\.[/\\]/.test(selectedDir)) {
  showToast("Invalid export directory.");
  return;
}
```

This only catches `../` and `..\`. It misses:
- Absolute paths to sensitive directories (`C:\Windows\System32`, `/etc/passwd`)
- Unicode homoglyphs (`‥` instead of `..`)
- Symlink traversal (if the filesystem has symlinks)

Since this is an Electron app with full filesystem access, a malicious or buggy path could write exports to system directories.

**Fix:** Use a whitelist approach — only allow exports to user-selected directories via the native dialog, and validate that the selected path is within the user's home or a configured export directory. The dialog already restricts to user-selected paths, so this is defense-in-depth.

### 1.9 Positive — Undo/redo system is robust

- Per-photo history with independent stacks
- Dynamic cap based on album size (10/20/50)
- LRU eviction for non-visible photos (when the bug in 1.2 is fixed)
- `UNDO` and `REDO` properly swap past/future
- `SET_EDITS` (for presets) pushes to history
- `COPY_EDITS` / `PASTE_EDITS` support batch paste to selection

### 1.10 Positive — Batch operations are well-designed

- `batchSavePhotos` API sends all dirty photos in one request
- `batchUpdateEdits` applies edits to multiple photos at once
- Export manager handles batch export with progress
- Kiosk send uses `Promise.allSettled` for parallel enqueuing

---

## 2. Album Import — `apps/master/src/components/albums/ImportAlbumModal.tsx`

### 2.1 Architecture Overview

4-step wizard:
1. **Photographer** — select from dropdown (defaults to first photographer)
2. **Source** — folder picker via `<input webkitdirectory>` (local device/USB)
3. **Selection** — grid of thumbnails with select/deselect all
4. **Details** — title, room number, customer email (required), session type

### 2.2 Finding — No file size or count validation before processing

**Severity: MEDIUM**  
**File:** `ImportAlbumModal.tsx` lines 114–158

```ts
const processFiles = async (files: File[], sourceLabel: string) => {
  // ...
  setPhotoFiles(files);
  // Generate thumbnails in background batches
  const batchSize = 6;
  for (let i = 0; i < files.length; i += batchSize) {
    // ... thumbnail generation
  }
};
```

No validation for:
- Maximum file count (a 10,000-photo SD card will hang the UI)
- Maximum file size (a 100MB RAW file will crash the thumbnail generator)
- Supported formats (accepts any `image/*`, including TIFF, BMP, WebP which may not be supported by the backend)
- Duplicate detection (same file imported twice creates duplicate records)

**Fix:** Add pre-flight validation:

```ts
const MAX_FILES = 500;
const MAX_FILE_SIZE_MB = 50;
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

if (files.length > MAX_FILES) {
  setValidationErrors({ folder: `Too many files. Maximum ${MAX_FILES} photos per import.` });
  return;
}

const oversized = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
if (oversized.length > 0) {
  setValidationErrors({ folder: `${oversized.length} files exceed ${MAX_FILE_SIZE_MB}MB limit.` });
  return;
}
```

### 2.3 Finding — Thumbnail generation has no error boundary

**Severity: LOW**  
**File:** `ImportAlbumModal.tsx` lines 135–144

```ts
const thumbnailPromises = batch.map(async (file, index) => {
  try {
    const thumbUrl = await createThumbnail(file, 400, 400);
    return { id: initialPreviews[i + index].id, url: thumbUrl };
  } catch (e) {
    const blobUrl = createSafeObjectURL(file);
    blobUrlsRef.current.add(blobUrl);
    return { id: initialPreviews[i + index].id, url: blobUrl };
  }
});
```

If `createThumbnail` fails, it falls back to the full-resolution image as a blob URL. For a 50MB RAW file, this creates a 50MB blob in memory per photo. With 100 photos, that's 5GB of blob URLs.

**Fix:** Add a size check before creating the blob fallback:

```ts
catch (e) {
  if (file.size > 5 * 1024 * 1024) {
    // Use a generic placeholder for large files
    return { id: initialPreviews[i + index].id, url: '/assets/placeholder-image.svg' };
  }
  const blobUrl = createSafeObjectURL(file);
  // ...
}
```

### 2.4 Finding — Email validation regex is too permissive

**Severity: LOW**  
**File:** `ImportAlbumModal.tsx` line 204

```ts
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

This accepts `a@b.c` (single-character TLD) and `test@localhost` (no dot). It also accepts `foo@bar..com` (double dot). For a production CRM, email validation should be stricter or use a library like `zod` with `z.email()`.

**Fix:** Use the same Zod schema as the backend:

```ts
const emailSchema = z.string().email();
if (!emailSchema.safeParse(customerEmail).success) {
  errors.customerEmail = "Please enter a valid email address.";
}
```

### 2.5 Finding — `roomNumber` is not validated or sanitized

**Severity: LOW**  
**File:** `ImportAlbumModal.tsx` lines 606–617

Room number is free text with no validation. A malicious input could inject SQL if the backend doesn't parameterize queries (it does, via `dbManager.run` with `?` placeholders, so this is safe). However, XSS is possible if the room number is rendered without escaping in other components.

**Fix:** Add basic sanitization on the frontend (strip `<>` characters) and ensure backend uses parameterized queries (verified: it does).

### 2.6 Finding — No progress tracking for the actual import API call

**Severity: LOW**  
**File:** `ImportAlbumModal.tsx` lines 242–252

```ts
setIsImporting(true);
try {
  await onImport(albumData, selectedFiles);
  onClose();
} catch (e) {
  // ...
}
```

The `onImport` prop is passed from the parent (`Albums.tsx`). The modal shows a spinner but no progress percentage. For a 200-photo import, the user sees "Importing..." for 30+ seconds with no feedback.

**Fix:** The `onImport` function should accept an `onProgress` callback, or the import should be chunked with progress updates.

### 2.7 Positive — Memory management for blob URLs

- `blobUrlsRef` tracks all created blob URLs
- Cleanup on unmount revokes all blobs
- Cleanup on modal close clears the ref
- `createSafeObjectURL` is used instead of raw `URL.createObjectURL`

### 2.8 Positive — Form validation is inline (no alerts)

- Replaced `alert()` with inline error messages
- Validation errors are per-field and clear on input change
- Submit button is disabled until required fields are filled

---

## 3. Kiosk Pairing from Master Settings — `KioskPairing.tsx` + Backend

### 3.1 Architecture Overview

Two pairing mechanisms:

1. **QR Code Pairing (legacy)** — `KioskPairing.tsx` generates a QR with JSON payload containing `pairingToken`, `httpUrl`, `wsUrl`, `expiresAt`. The Touch kiosk scans the QR and POSTs to `/api/pairing/validate`.

2. **Challenge-Response Pairing (v1, secure)** — `routes/pairing.ts` lines 268–363. Touch requests a nonce from `/v1/pairing/challenge`, signs it with HMAC-SHA256, and exchanges it for a per-kiosk secret at `/v1/pairing/exchange`.

### 3.2 Finding — QR Code pairing token is sent over HTTP (not HTTPS)

**Severity: HIGH**  
**File:** `KioskPairing.tsx` lines 68–69, 152–162

```ts
const serverHttpUrl = `http://${effectiveIp}:${window.location.port || '8090'}`;
const serverWsUrl = `ws://${effectiveIp}:${window.location.port || '8090'}`;
```

The QR code encodes `http://` URLs. In a LAN environment (the intended use case), this is acceptable — the traffic never leaves the local network. However:
- If the Master is on a public Wi-Fi (hotel guest network), HTTP is sniffable
- The `pairingToken` is a bearer token — anyone who captures it can pair a rogue kiosk

**Mitigation:** The pairing token is single-use (line 110 in `pairing.ts`: `if (tokenData.used) { return 409 }`). This limits the window of attack to the 15-minute expiration. However, HTTP sniffing in a LAN is trivial with ARP spoofing.

**Recommendation:** Add a note in the UI: "Ensure your network is secure. Pairing tokens are single-use and expire in 15 minutes." For high-security deployments, document the need for VLAN isolation or WPA3-Enterprise.

### 3.3 Finding — `KioskPairing.tsx` doesn't verify the backend `/api/pairing/register` success

**Severity: MEDIUM**  
**File:** `KioskPairing.tsx` lines 54–92

```ts
const initializePairing = async () => {
  const token = generatePairingToken();
  // ...
  try {
    const res = await fetch(`${baseUrl}/api/pairing/register`, { ... });
    if (!res.ok) {
      throw new Error(errData.message || `Server returned ${res.status}`);
    }
    logger.info('Pairing token registered with backend');
  } catch (error) {
    logger.error('Failed to register pairing token', error);
  }
};
```

If the backend registration fails (e.g., DB is locked, server is down), the QR code is still displayed with an **unregistered token**. The Touch kiosk will scan it, try to validate, and get a 404. The user sees no error — the QR just "doesn't work."

**Fix:** Show an error state in the UI when registration fails. Don't display the QR until the token is confirmed in the DB.

```ts
const [registrationStatus, setRegistrationStatus] = useState<'pending' | 'success' | 'error'>('pending');
// ...
if (!res.ok) {
  setRegistrationStatus('error');
  throw new Error(...);
}
setRegistrationStatus('success');
```

### 3.4 Finding — Challenge-response pairing uses `req.ip` for LAN whitelist, which may be wrong behind proxy

**Severity: MEDIUM**  
**File:** `routes/pairing.ts` lines 55–62

```ts
router.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.get('x-forwarded-for') || '';
  if (!isPrivateIp(clientIp)) {
    return res.status(403).json({ error: "Forbidden", message: "Pairing only allowed over local network." });
  }
  next();
});
```

`req.ip` in Express returns the leftmost `X-Forwarded-For` IP if `trust proxy` is enabled. If the Master is behind a reverse proxy (e.g., nginx on the same machine), `req.ip` could be `127.0.0.1` (which passes) or the proxy's internal IP. If `trust proxy` is not configured, `req.ip` might be the proxy's IP rather than the client's.

**Fix:** Explicitly check `req.socket.remoteAddress` as a fallback and document the `trust proxy` setting:

```ts
const clientIp = req.socket.remoteAddress || req.ip || req.get('x-forwarded-for') || '';
```

### 3.5 Finding — `collections.ts` HMAC verification has a bypass path

**Severity: HIGH**  
**File:** `routes/collections.ts` lines 67–112

```ts
const verifyKioskHmac = async (req: Request, res: Response, next: NextFunction) => {
  const kioskId = req.headers["x-kiosk-id"] as string;
  if (!kioskId) {
    return next();  // BUG: no kiosk ID = bypass HMAC entirely!
  }
  // ... rest of HMAC verification
};
```

If a request omits the `X-Kiosk-Id` header, the middleware calls `next()` without any authentication. This means **any request without `X-Kiosk-Id` bypasses HMAC verification** and proceeds to the route handler.

The `collections.ts` router is used for generic CRUD on all tables (albums, photos, kiosks, users, etc.). A malicious actor on the LAN could send a request without `X-Kiosk-Id` and access/modify any data.

**Fix:** The middleware should require HMAC for all LAN requests, or at least require session auth for non-kiosk requests:

```ts
const verifyKioskHmac = async (req: Request, res: Response, next: NextFunction) => {
  const kioskId = req.headers["x-kiosk-id"] as string;
  
  if (!kioskId) {
    // Not a kiosk request — require session authentication instead
    if (!req.session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return next();
  }
  
  // ... HMAC verification for kiosk requests
};
```

### 3.6 Finding — `pairing.ts` `/pairing/validate` doesn't verify the kiosk's IP matches the token

**Severity: LOW**  
**File:** `routes/pairing.ts` lines 86–178

When a kiosk validates a token, the route checks:
- Token exists
- Token not expired
- Token not used

But it doesn't verify that the requesting IP is on the same LAN as the Master that generated the token. A token captured via HTTP sniffing could be validated from anywhere (if the `/pairing/validate` endpoint is exposed, which it is — though the LAN whitelist blocks non-private IPs).

Since the LAN whitelist is already in place, this is defense-in-depth. Marking as **low** because the LAN whitelist mitigates it.

### 3.7 Positive — Challenge-response pairing is cryptographically sound

- Nonce is 32 bytes from `crypto.randomBytes`, base64-encoded
- Nonce TTL is 5 minutes with automatic cleanup
- Signature is HMAC-SHA256 over `kiosk_id|nonce` with key `desk_id|hardware_fingerprint`
- Uses `crypto.timingSafeEqual` to prevent timing attacks
- Per-kiosk HMAC secret is 32 bytes, base64-encoded, persisted in DB
- Zod validation on exchange body with strict regex patterns

### 3.8 Positive — mDNS discovery is well-structured

- `MasterMdnsDiscovery` class encapsulates Bonjour service
- Advertises on `clickflash` type, port 8090
- Browses for `clickflash-touch` type
- Maintains internal list of discovered devices
- Cleanup method `stop()` destroys Bonjour instance

---

## 4. Cross-Cutting Issues

### 4.1 Finding — `collections.ts` uses `req as any` for session access

**Severity: LOW**  
**File:** `routes/collections.ts` line 117

```ts
const user = (req as any).session?.user || (req as any).user;
```

This bypasses TypeScript's type checking. The `Request` type should be extended with a `session` property (as is done in `pairing.ts` with `PairingContext`).

### 4.2 Finding — `Albums.tsx` (parent of editor) is 2,086 LoC — monolithic

**Severity: LOW (maintainability)**  
**File:** `apps/master/src/components/albums/Albums.tsx`

This file handles:
- Album list/grid view
- Album creation/deletion
- Import modal orchestration
- Editor mounting/unmounting
- Tether mode
- Batch operations (delete, export, send to kiosk)
- Analytics overlay

**Recommendation:** Split into `AlbumList.tsx`, `AlbumDetail.tsx`, `AlbumToolbar.tsx`. The `Albums.tsx` should be a thin router that mounts the appropriate sub-component based on route state.

### 4.3 Finding — No rate limiting on album import or pairing endpoints

**Severity: MEDIUM**  
**Files:** `routes/collections.ts`, `routes/pairing.ts`

The backend has no rate limiting middleware. A malicious kiosk or script could:
- Flood `/pairing/register` to fill the DB with tokens
- Flood `/pairing/validate` to brute-force tokens (though tokens are UUIDs, so this is infeasible)
- Flood `/collections/photos` to create thousands of photo records

**Fix:** Add `express-rate-limit` to sensitive endpoints:

```ts
import rateLimit from 'express-rate-limit';

const pairingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: "Too many pairing attempts." }
});

router.use('/pairing', pairingLimiter);
```

---

## 5. Summary of Findings

| # | Finding | Severity | Area | Fix Required |
|---|---|---|---|---|
| 1.2 | History memory leak: `newHistories` computed but discarded | **MEDIUM** | Editor | **YES** — use `newHistories` in return |
| 1.3 | `RESET_EDITS` uses `MAX_HISTORY` (50) not dynamic cap | LOW | Editor | **YES** — use `getHistoryCap()` |
| 1.4 | `handleAutoEnhance` is fake AI (hardcoded + delay) | LOW | Editor | Optional — rename or wire real analysis |
| 1.5 | `useAlbumEditState.ts` is orphaned dead code | LOW | Editor | Check imports, remove if unused |
| 1.7 | Autosave draft restores discarded edits | **MEDIUM** | Editor | **YES** — add discard flag or confirm modal |
| 1.8 | Export path traversal check incomplete | LOW | Editor | Defense-in-depth — add whitelist |
| 2.2 | No file size/count validation on import | **MEDIUM** | Import | **YES** — add pre-flight checks |
| 2.3 | Thumbnail fallback creates full-size blobs | LOW | Import | **YES** — size limit before blob fallback |
| 2.4 | Email regex too permissive | LOW | Import | **YES** — use Zod email schema |
| 2.5 | `roomNumber` not sanitized | LOW | Import | **YES** — strip `<>` chars |
| 2.6 | No import progress tracking | LOW | Import | Optional — add `onProgress` callback |
| 3.2 | QR code pairing over HTTP (LAN sniffing risk) | **HIGH** | Pairing | Document risk; add UI warning |
| 3.3 | QR displayed even if backend registration fails | **MEDIUM** | Pairing | **YES** — show error state, block QR |
| 3.4 | `req.ip` may be wrong behind proxy | **MEDIUM** | Pairing | **YES** — use `req.socket.remoteAddress` |
| 3.5 | **HMAC bypass: no `X-Kiosk-Id` = no auth** | **HIGH** | Collections | **YES** — require session auth for non-kiosk |
| 4.1 | `req as any` bypasses TypeScript | LOW | Backend | **YES** — extend Request type |
| 4.2 | `Albums.tsx` is 2,086 LoC monolith | LOW | Frontend | Refactor into sub-components |
| 4.3 | No rate limiting on pairing/import | **MEDIUM** | Backend | **YES** — add `express-rate-limit` |

---

## 6. Code Changes Required

### 6.1 `apps/master/src/components/albums/editor2/hooks/useEditorState.ts`

**Fix 1.2 (UPDATE_EDIT):**
```ts
// Line 179–202: Replace with:
const maxHistory = getHistoryCap(state.photos.length);
const newPast = [...currentHistory.past, currentEdits];
const trimmedPast = newPast.length > maxHistory ? newPast.slice(-maxHistory) : newPast;
const visibleIds = new Set(state.photos.slice(0, 10).map(p => p.id));
const newHistories = evictLRUHistories(state.histories, state.activePhotoId ?? '', visibleIds, maxHistory);
newHistories[state.activePhotoId] = { past: trimmedPast, future: [] };

return {
  ...state,
  edits: { ...state.edits, [state.activePhotoId]: newEdits },
  dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(state.activePhotoId),
  isDirty: true,
  histories: newHistories,  // FIX: use computed newHistories
};
```

**Fix 1.2 (SET_EDITS):** Same pattern — use `newHistories` in return.

**Fix 1.3 (RESET_EDITS / RESET_ACTIVE_EDIT):**
```ts
// Replace .slice(-MAX_HISTORY) with .slice(-getHistoryCap(state.photos.length))
```

### 6.2 `apps/master/backend/routes/collections.ts`

**Fix 3.5 (HMAC bypass):**
```ts
const verifyKioskHmac = async (req: Request, res: Response, next: NextFunction) => {
  const kioskId = req.headers["x-kiosk-id"] as string;
  
  if (!kioskId) {
    // Not a kiosk request — require session authentication
    if (!(req as any).session?.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Session required." });
    }
    return next();
  }
  
  // ... existing HMAC verification
};
```

### 6.3 `apps/master/src/components/settings/KioskPairing.tsx`

**Fix 3.3 (Registration failure handling):**
```ts
const [registrationStatus, setRegistrationStatus] = useState<'pending' | 'success' | 'error'>('pending');

// In initializePairing:
if (!res.ok) {
  setRegistrationStatus('error');
  throw new Error(...);
}
setRegistrationStatus('success');

// In render:
{registrationStatus === 'error' && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
    Failed to register pairing token. Please check your network connection and try again.
  </div>
)}
{registrationStatus === 'success' && <canvas ref={canvasRef} ... />}
```

### 6.4 `apps/master/backend/routes/pairing.ts`

**Fix 3.4 (IP detection):**
```ts
const clientIp = req.socket.remoteAddress || req.ip || req.get('x-forwarded-for') || '';
```

---

## 7. Verification Commands

```bash
# Check if useAlbumEditState is used anywhere
cd apps/master/src && grep -rn "useAlbumEditState" --include="*.tsx" --include="*.ts"

# Typecheck the editor
cd apps/master && npx tsc --noEmit

# Check for other HMAC bypasses
grep -rn "if (!kioskId)" apps/master/backend/routes/

# Check for rate limiting
grep -rn "rateLimit\|express-rate-limit" apps/master/backend/
```

---

## 8. Next Steps

1. **Apply fixes 1.2, 1.3, 3.3, 3.4, 3.5** — these are the highest-impact security and stability fixes
2. **Add rate limiting** to pairing and collection endpoints
3. **Refactor `Albums.tsx`** into sub-components (maintenance task, not urgent)
4. **Audit `apps/master/src/components/albums/editor2/canvas/`** — WebGL rendering, filter shaders, memory management (future pass)
5. **Test import with 500+ photos** — validate memory usage and UI responsiveness
