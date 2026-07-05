# ClickFlash Master Electron App — Full Audit & Fix Plan

> **Date:** 2026-06-12
> **Status:** Backend starts but needs fixes for production EXE
> **Goal:** Make Master app run as standalone EXE without manual backend startup

---

## 🔴 CRITICAL ISSUES FOUND

### 1. Backend Port Conflict (EADDRINUSE)
- **Issue:** Port 8090 already in use when Electron tries to fork backend
- **Impact:** Electron app shows "Failed to Load Application" error
- **Fix:** Add port availability check + dynamic port fallback

### 2. Missing .trie Files in Bundle
- **Issue:** `data.trie`, `classes.trie`, etc. not copied to `dist/backend/`
- **Impact:** Backend crashes on fontkit operations
- **Fix:** Add copy step to build script

### 3. Database Migration Failures
- **Issue:** Migration `010_performance_indexes.sql` references columns that don't exist yet
- **Impact:** Fresh installs fail on first run
- **Fix:** Fix migration to use `IF EXISTS` checks

### 4. Backend Not Auto-Starting in Packaged Mode
- **Issue:** `startBackend()` only forks when `app.isPackaged` is true, but dev mode expects manual start
- **Impact:** Users must manually start backend before launching Electron
- **Fix:** Always fork backend in both dev and packaged modes

### 5. Frontend Build Not Included in dist/master
- **Issue:** `dist/master/` exists but may be outdated or missing assets
- **Impact:** 404 errors on frontend files
- **Fix:** Ensure `npm run build` completes before packaging

---

## 📋 DETAILED FIX PLAN

### Phase 1: Fix Backend Startup (30 min)

1. **Modify `electron-main.js` to always fork backend**
   - Remove `if (!app.isPackaged)` early return
   - Add port conflict detection
   - Add retry logic with port fallback

2. **Fix `startBackend()` function**
   - Check if port is available before forking
   - Kill existing process on same port
   - Wait for backend health before loading renderer

### Phase 2: Fix Build Process (30 min)

1. **Add .trie file copy to build script**
   - Modify `scripts/copy-assets.ts` or add post-build step
   - Copy all `*.trie` from `node_modules/@foliojs-fork/fontkit/`

2. **Fix migration SQL**
   - Comment out or wrap `CREATE INDEX` statements with `IF EXISTS` checks
   - Ensure columns exist before creating indexes

3. **Verify dist/master/ contents**
   - Check `index.html` exists
   - Check JS/CSS bundles exist
   - Check all assets are present

### Phase 3: Test EXE Build (30 min)

1. **Build backend**: `npm run build:backend`
2. **Build frontend**: `npm run build`
3. **Build Electron**: `npm run build:electron`
4. **Package EXE**: `npm run package:installer` or `npx electron-builder`
5. **Test EXE on clean environment**

### Phase 4: Documentation (15 min)

1. Update `RELEASES/v4.2.0/README.md` with known issues
2. Add troubleshooting section
3. Document manual backend start workaround

---

## 🔧 IMMEDIATE FIXES NEEDED

### Fix 1: electron-main.js — Always Fork Backend

```javascript
// In startBackend() function — remove the dev mode early return:
function startBackend() {
  return new Promise((resolve, reject) => {
    // REMOVE THIS BLOCK:
    // if (!app.isPackaged) {
    //   console.log("[Main] Dev mode — backend expected on port", BACKEND_PORT);
    //   resolve(null);
    //   return;
    // }
    
    // Always fork backend, both dev and prod
    const serverPath = getUnpackedPath("dist/backend/server.js");
    // ... rest of function
  });
}
```

### Fix 2: Add Port Conflict Resolution

```javascript
// Add to startBackend():
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
}

// In startBackend():
const portAvailable = await isPortAvailable(BACKEND_PORT);
if (!portAvailable) {
  console.warn(`[Main] Port ${BACKEND_PORT} in use, attempting to kill existing process...`);
  // Try to find and kill process on port
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'win32') {
      execSync(`FOR /F "tokens=5" %a IN ('netstat -ano ^| findstr :${BACKEND_PORT}') DO taskkill //F //PID %a`, { stdio: 'ignore' });
    } else {
      execSync(`lsof -ti:${BACKEND_PORT} | xargs kill -9`, { stdio: 'ignore' });
    }
    await new Promise(r => setTimeout(r, 2000)); // Wait for port release
  } catch (e) {
    console.warn('[Main] Could not kill existing process:', e.message);
  }
}
```

### Fix 3: Copy .trie Files in Build

```javascript
// Add to scripts/copy-assets.ts or as post-build step:
const trieFiles = [
  'node_modules/@foliojs-fork/fontkit/data.trie',
  'node_modules/@foliojs-fork/fontkit/indic.trie',
  'node_modules/@foliojs-fork/fontkit/use.trie',
  'node_modules/@foliojs-fork/linebreak/src/classes.trie'
];

for (const trieFile of trieFiles) {
  const src = path.join(ROOT_DIR, trieFile);
  const dest = path.join(ROOT_DIR, 'dist/backend', path.basename(trieFile));
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[Assets] Copied ${trieFile} to dist/backend/`);
  }
}
```

### Fix 4: Fix Migration SQL

```sql
-- 010_performance_indexes.sql — wrap with IF EXISTS checks:

-- Albums table indexes
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
-- Only create if column exists:
SELECT CASE WHEN COUNT(*) > 0 
  THEN (CREATE INDEX IF NOT EXISTS idx_albums_photographerId ON albums(photographerId))
  ELSE NULL END
FROM pragma_table_info('albums') WHERE name = 'photographerId';
```

---

## 📊 TESTING CHECKLIST

| Test | Expected Result | Status |
|------|----------------|--------|
| `npm run build:backend` | Completes without errors | ⬜ |
| `node dist/backend/server.js` | Starts on port 8090 | ⬜ |
| `curl http://localhost:8090/api/health` | Returns 200 OK | ⬜ |
| `npm run build` | Frontend builds to dist/master/ | ⬜ |
| `npm run package:installer` | EXE created in release/ | ⬜ |
| Run EXE on clean PC | Shows splash, then loads app | ⬜ |
| Backend auto-starts | No manual intervention needed | ⬜ |
| Kiosk pairing works | Auto-discovers Touch devices | ⬜ |

---

## 🎯 SUCCESS CRITERIA

1. **Double-click EXE** → Splash screen appears
2. **Backend forks automatically** → No manual `node server.js` needed
3. **Health check passes** → `/api/health` returns 200
4. **Renderer loads** → App UI appears (not error screen)
5. **All features work** → Photos, orders, kiosk pairing functional

---

## ⏱️ TIMELINE

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Fix backend startup | 30 min | Modified electron-main.js |
| Phase 2: Fix build process | 30 min | Working build scripts |
| Phase 3: Test EXE | 30 min | Verified EXE file |
| Phase 4: Document | 15 min | Updated README |
| **Total** | **~2 hours** | **Working Master EXE** |

---

## 📝 NOTES

- **Current workaround:** Users must manually run `node dist/backend/server.js` before launching Electron
- **Root cause:** Electron's `startBackend()` has an early return for dev mode that prevents auto-forking
- **Impact:** This blocks the "1-click install" experience for customers
- **Priority:** 🔴 CRITICAL — must fix before distributing EXE to customers

---

**Next Action:** Start Phase 1 — modify `electron-main.js` to always fork backend
