# Album Editor - Full Audit & Photo Zoom Enhancement Plan

**Date:** 2026-03-15  
**Status:** Audit Complete - Implementation Plan Ready  
**Scope:** Master App Album Editor (`apps/master/src/components/albums/editor2/`)

---

## 📋 Executive Summary

The Album Editor has **basic zoom functionality** implemented but with significant gaps in UX, consistency, and advanced features. This audit identifies **3 critical**, **5 high**, and **8 medium** priority issues requiring attention.

### Current Zoom Implementation Status
| Component | Status | Issues |
|-----------|--------|--------|
| `useZoomPan.ts` | ✅ Functional | Missing touch support, no animation |
| `ZoomControls.tsx` | ✅ UI Exists | Limited features (no fit/actual pixels) |
| `EditorCanvas.tsx` | ⚠️ Partial | Doesn't sync with crop/retouch modes |
| `InteractiveViewport.tsx` | ⚠️ Unused | Alternative implementation, not integrated |
| Keyboard Shortcuts | ✅ Basic | Ctrl+0, +/- working |

---

## 🚨 Critical Issues (Must Fix)

### 1. Zoom State Not Persisted Per Photo
**File:** `EditorCanvas.tsx`, `useZoomPan.ts`  
**Issue:** When switching between photos, zoom level resets to fit. Users lose their zoom position when reviewing multiple photos.  
**Impact:** High - Breaks workflow for detail editing  
**Solution:** 
- Store zoom state per photo ID in `useEditorState`
- Restore zoom when returning to previously viewed photo
- Add "Reset on photo change" toggle in settings

```typescript
// Proposed state extension
interface EditorState {
  // ... existing
  zoomStates: Record<string, { scale: number; offsetX: number; offsetY: number }>;
}
```

### 2. Crop Mode Zoom Conflict
**File:** `EditorCanvas.tsx`, `CropOverlay.tsx`  
**Issue:** Zoom and pan are disabled during crop mode, but the crop overlay doesn't handle zoomed images correctly. Crop handles appear in wrong positions.  
**Impact:** High - Crop tool unusable on zoomed images  
**Solution:**
- Coordinate crop coordinates with zoom transform
- Add "crop at current zoom" vs "crop at 100%" option
- Lock zoom during crop but show zoomed preview

### 3. Retouch Tool Coordinate Mapping
**File:** `RetouchInteractionOverlay.tsx`, `EditorCanvas.tsx`  
**Issue:** Retouch brush coordinates don't account for zoom/pan transforms. Clicking at zoomed position applies edit to wrong location.  
**Impact:** High - Retouch tool broken at non-100% zoom  
**Solution:**
- Transform mouse coordinates by inverse zoom matrix
- Apply edits at correct natural image coordinates

---

## 🔴 High Priority Issues

### 4. Missing "Fit to Screen" & "Actual Pixels" Quick Actions
**File:** `ZoomControls.tsx`  
**Current:** Only +/- and reset buttons  
**Missing:** 
- Fit to screen (F key exists but no UI button)
- Actual pixels (100% - 1:1 pixel ratio)
- Fit width/height options

**Proposed UI:**
```
[+] [100%] [-]  |  [Fit] [1:1] [Fill]
```

### 5. No Zoom Level Indicator in Toolbar
**File:** `AlbumEditor.tsx` (Toolbar)  
**Issue:** Zoom % only shown in canvas corner, not visible when sidebar collapsed  
**Solution:** Add zoom display to main toolbar with dropdown for quick selection

### 6. Touch/Pinch-to-Zoom Not Implemented
**File:** `useZoomPan.ts`  
**Issue:** No touch gesture support for tablets/touchscreens  
**Solution:**
- Add touch event handlers
- Implement pinch gesture detection
- Two-finger pan support

### 7. Zoom Animation Missing
**File:** `useZoomPan.ts`  
**Issue:** Zoom changes are instant/jarring  
**Solution:** Add smooth transition (200-300ms) for zoom level changes

### 8. No Magnifier/Loupe Tool
**File:** New component needed  
**Issue:** No way to inspect fine details at pixel level  
**Solution:** Add loupe tool (activated by holding Space or Z key)
- Shows 2x/4x magnified view under cursor
- Optional split-screen loupe mode

---

## 🟡 Medium Priority Issues

### 9. Zoom Controls Hidden During Certain Modes
**File:** `EditorCanvas.tsx`  
**Issue:** Zoom controls may be obscured by crop/retouch overlays  
**Solution:** Ensure zoom controls always visible with z-index layering

### 10. No Scrollbar Indicators for Pan Position
**File:** `EditorCanvas.tsx`  
**Issue:** Users lose track of pan position when zoomed in  
**Solution:** Add minimap or scrollbar indicators showing viewport position

### 11. Mouse Wheel Zooms Page Instead of Image (Sometimes)
**File:** `useZoomPan.ts`  
**Issue:** Wheel event prevention inconsistent  
**Solution:** Improve `preventDefault` handling, add `passive: false` consistently

### 12. Zoom Not Accessible via Screen Reader
**File:** `ZoomControls.tsx`  
**Issue:** Missing ARIA labels, live regions for zoom changes  
**Solution:** Add proper accessibility attributes

### 13. No Keyboard Pan (Arrow Keys)
**File:** `useZoomPan.ts`  
**Issue:** Arrow keys currently navigate photos, not pan image  
**Solution:** 
- Alt+Arrow keys for pan (when zoomed)
- Or hold Space + Arrow keys
- Add to KeyboardShortcutsHelp

### 14. Zoom Bounds Not Configurable
**File:** `useZoomPan.ts`  
**Current:** Hardcoded 10% - 500%  
**Issue:** Some workflows need higher zoom (retouching)  
**Solution:** Make min/max zoom configurable per tool mode

### 15. No Zoom History/Undo
**File:** New feature  
**Issue:** Can't undo zoom changes separately from edits  
**Solution:** Add zoom to undo stack or separate zoom history

### 16. Inconsistent Zoom Between Editor Modes
**File:** `InteractiveViewport.tsx` vs `useZoomPan.ts`  
**Issue:** Two different zoom implementations exist  
**Solution:** Consolidate to single zoom system, deprecate unused code

---

## 📁 Files Requiring Changes

### Core Zoom System
| File | Changes |
|------|---------|
| `useZoomPan.ts` | Add touch support, animations, bounds config |
| `ZoomControls.tsx` | Add fit/actual pixels buttons, dropdown |
| `EditorCanvas.tsx` | Fix crop/retouch coordinate mapping, persist zoom |

### State Management
| File | Changes |
|------|---------|
| `useEditorState.ts` | Add zoom state persistence per photo |
| `types.ts` | Add zoom state types |

### Tool Integration
| File | Changes |
|------|---------|
| `CropOverlay.tsx` | Handle zoomed coordinates |
| `RetouchInteractionOverlay.tsx` | Transform mouse coordinates |
| `KeyboardShortcutsHelp.tsx` | Update shortcuts documentation |

### New Components
| File | Purpose |
|------|---------|
| `ZoomToolbar.tsx` | Toolbar-integrated zoom display |
| `LoupeTool.tsx` | Magnifier overlay |
| `Minimap.tsx` | Pan position indicator |

---

## 🎯 Implementation Phases

### Phase 1: Critical Fixes (Week 1)
1. Fix retouch coordinate mapping
2. Fix crop mode zoom handling
3. Add zoom state persistence

### Phase 2: High Priority (Week 2)
4. Enhance ZoomControls with fit/actual pixels
5. Add zoom indicator to toolbar
6. Implement pinch-to-zoom
7. Add zoom animations

### Phase 3: Polish & Features (Week 3)
8. Add loupe/magnifier tool
9. Improve accessibility
10. Add keyboard pan
11. Consolidate zoom implementations

### Phase 4: Testing & Optimization (Week 4)
12. E2E tests for zoom interactions
13. Performance optimization
14. Touch device testing

---

## 🧪 Testing Checklist

### Basic Zoom
- [ ] Zoom in with button
- [ ] Zoom out with button
- [ ] Zoom with Ctrl+Wheel
- [ ] Zoom with +/- keys
- [ ] Reset zoom with Ctrl+0
- [ ] Double-click to reset
- [ ] Fit to screen (F key)

### Pan
- [ ] Pan with drag (zoomed in)
- [ ] Pan with Space+drag
- [ ] Pan constraints (can't lose image)
- [ ] Pan with arrow keys (when implemented)

### Tool Integration
- [ ] Crop works at zoomed level
- [ ] Retouch works at zoomed level
- [ ] Zoom persists when switching photos
- [ ] Zoom resets appropriately on photo change (configurable)

### Touch
- [ ] Pinch to zoom
- [ ] Two-finger pan
- [ ] Touch doesn't trigger mouse events

### Accessibility
- [ ] Zoom buttons keyboard accessible
- [ ] ARIA live region announces zoom %
- [ ] Screen reader can navigate zoomed image

---

## 📊 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Zoom UX Score (1-10) | 5 | 9 |
| Tool Integration | 60% | 100% |
| Touch Support | 0% | 100% |
| Accessibility (a11y) | 40% | 90% |
| User Workflow Interruption | High | Minimal |

---

## 🔗 Related Documentation

- [ALBUM_EDITOR_AUDIT.md](./apps/master/src/components/albums/editor2/ALBUM_EDITOR_AUDIT.md) - Previous audit
- [EDITOR2_FEATURES.md](./apps/master/src/components/albums/editor2/EDITOR2_FEATURES.md) - Feature documentation
- [AGENTS.md](./AGENTS.md) - Project coding standards

---

## 📝 Notes

1. **Backward Compatibility:** Zoom API changes should be backward compatible
2. **Performance:** GPU-accelerated transforms already in use, maintain this
3. **Mobile:** Touch support critical for tablet-based editing workflows
4. **User Training:** Update keyboard shortcuts documentation

---

**Next Action:** Begin Phase 1 implementation - Critical zoom fixes

**Estimated Effort:** 3-4 weeks (1 developer)

**Review Date:** 2026-03-22 (Phase 1 completion)
