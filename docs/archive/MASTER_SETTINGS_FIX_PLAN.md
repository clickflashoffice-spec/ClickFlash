# Master App Settings Pages - Fix Plan

## Summary

| Category | Count |
|----------|-------|
| Files Analyzed | 19 |
| **High Priority** Issues | 8 |
| **Medium Priority** Issues | 23 |
| **Low Priority** Issues | 15 |

---

## 🔴 High Priority Issues (Fix Immediately)

### 1. SystemStatusSettings.tsx - Duplicate Function Call
**Line 59-61:** `checkDb()` called twice in useEffect

**Fix:** Remove duplicate call

### 2. CloudSettings.tsx - Missing Error Handling
**Lines 74-90:** Async operations lack try-catch blocks

**Fix:** Add error handling with toast notifications

### 3. GeneralSettings.tsx - Duplicate Error Logging
**Lines 415-417:** `logger.error` called twice for same error

**Fix:** Remove duplicate logging

### 4. PrintSettings.tsx - Unsafe Window Access
**Lines 25, 59, 84:** `window.electron` accessed without type guards

**Fix:** Add type guard function

### 5-7. FileReader Missing Error Handling
**Files:** CustomerReceiptSettings.tsx, MasterPortalLogoSettings.tsx, WatermarkSettings.tsx

**Fix:** Add `onerror` handler to FileReader

### 8. CategoryManagement.tsx - Missing Accessibility
**Lines 56, 69, 70:** Buttons lack aria-labels

**Fix:** Add aria-label attributes

---

## 🟡 Medium Priority Issues

- `any` type usage (CloudSettings.tsx, SystemStatusSettings.tsx, KioskModeSettings.tsx)
- Native `alert()`/`confirm()` usage (8 files)
- Missing error handling (SessionTypesSettings.tsx, DataManagementSettings.tsx)
- Unused imports (GeneralSettings.tsx, CloudSettings.tsx)
- Page reload in PermissionsMatrix.tsx

---

## Implementation Order

1. **SystemStatusSettings.tsx** - Quick fix (duplicate call)
2. **CategoryManagement.tsx** - Quick fix (aria-labels)
3. **FileReader fixes** - 3 files (add onerror handlers)
4. **CloudSettings.tsx** - Add error handling
5. **PrintSettings.tsx** - Add type guards
6. **GeneralSettings.tsx** - Remove duplicate logging

---

## Files to Modify

### High Priority (8 files):
1. `SystemStatusSettings.tsx`
2. `CategoryManagement.tsx`
3. `CustomerReceiptSettings.tsx`
4. `MasterPortalLogoSettings.tsx`
5. `WatermarkSettings.tsx`
6. `CloudSettings.tsx`
7. `PrintSettings.tsx`
8. `GeneralSettings.tsx`

### Medium Priority (10+ files):
- Replace `alert()` with `showToast()`
- Replace `any` types with proper types
- Remove unused imports
