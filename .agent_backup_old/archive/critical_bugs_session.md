# Critical Bugs - Session Log

**Date**: 2026-01-18 14:21 CET  
**Session**: Post-Import Optimization Testing

---

## Bug 1: Album Photos Not Displaying ✅ FIXED

**Symptom**: Album shows "311 SELECTED" but filmstrip displays only 1 photo.

**Root Cause**: VirtualFilmstrip using **relative paths** directly instead of constructing full API endpoint URLs.

**Files Modified**:

- `VirtualFilmstrip.tsx` (lines 41-54, 85-92)

**Fix Applied**:

```typescript
// Before (broken):
const thumbUrl = photo.thumbnailUrl || photo.tinyUrl || ...;

// After (fixed):
const relativePath = photo.thumbnailUrl || photo.tinyUrl || ...;
const thumbUrl = `/api/files/photos/${photo.id}/${relativePath}`;
```

**Status**: Code deployed, awaiting frontend reload verification.

---

## Bug 2: Orders Not Displaying in List View ⏳ INVESTIGATING

**Symptom**: Orders page shows stats (€45.00, 3 pending, 3 ready for delivery) but **empty list**.

**Context**:

- Stats API working (shows correct counts)
- Orders exist in database
- List rendering failing

**Likely Cause**: Similar to Bug 1 - URL construction or data fetching issue.

**Next Steps**:

1. Verify Bug 1 fix works (check album photos display)
2. Investigate Orders component
3. Check order API response structure
4. Fix order list rendering

---

## Pattern Identified

**Common Root Cause**: Import optimization changed data structure (removed `tinyUrl`, only kept `thumbnailUrl`), but frontend components still expecting old paths or not constructing full URLs.

**Prevention**: Audit all components using photo/order URLs to ensure proper API endpoint construction.

---

**Current Priority**: Verify album fix → Fix orders display.
