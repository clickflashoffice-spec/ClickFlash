# Album Editor Bug Fixes

## Issues Fixed

### 1. Crop Mode - Image Disappears After Applying Crop ✅
**Problem**: After clicking "Apply Crop", the image would disappear from the canvas.

**Root Cause**: The crop data was being saved to `edits.crop` but the `getPhotoStyle` function didn't handle the crop property, so the image wasn't visually cropped.

**Fixes Applied**:
- Updated `styleUtils.ts` `getPhotoStyle()` to accept image dimensions and calculate CSS `clip-path` for crop preview
- Updated `usePhotoStyle` hook to pass image dimensions
- Updated `PhotoRenderer` to track image dimensions and apply the clip-path style

### 2. Retouch Mode - "Heal Blemishes" Not Working ✅
**Problem**: The healing brush tool would show the cursor but clicking wouldn't apply any healing effect.

**Root Cause**: The coordinate calculation in `EditorCanvas.tsx` used `imageRef.current.naturalWidth/Height` without checking if the image was fully loaded, resulting in 0 values.

**Fixes Applied**:
- Added safety checks in `EditorCanvas.tsx` `handleMouseDown` to ensure image is loaded before calculating coordinates
- Added safety checks in `handleMouseMove` for retouch preview
- Local variables now store natural dimensions to ensure valid coordinate mapping

### 3. "Done" Button Not Responding ✅
**Problem**: The green "Done" button in Retouch Mode appeared unresponsive.

**Root Cause**: The state management between the `handleRetouchDone` callback and the tab change handler was conflicting.

**Fixes Applied**:
- Updated `handleRetouchDone` in `AlbumEditor.tsx` to:
  - Set `isRetouching` to false
  - Switch active tab back to 'adjust'
  - Reset retouch step and target state

### 4. Navigation Between Images Broken ✅
**Problem**: When navigating to next/prev image, the canvas would remain black.

**Root Cause**: The `ProgressiveImage` component didn't reset its state when image URLs changed, causing the old image to persist or error states to carry over.

**Fixes Applied**:
- Added `useEffect` in `ProgressiveImage` to reset error state and loaded URL when `previewUrl` or `fullResUrl` changes
- Added `loadedUrl` state to track which image is actually loaded
- Fixed opacity transitions between preview and hi-res layers
- Added `onLoad` and `onError` handlers to the hi-res image layer

## Files Modified

1. `apps/master/src/utils/styleUtils.ts` - Added crop handling with clip-path
2. `apps/master/src/components/albums/editor2/hooks/usePhotoStyle.ts` - Added image dimension params
3. `apps/master/src/components/albums/editor2/renderer/PhotoRenderer.tsx` - Track dimensions, apply clip-path
4. `apps/master/src/components/albums/editor2/canvas/EditorCanvas.tsx` - Fixed coordinate calculation safety
5. `apps/master/src/components/albums/editor2/viewer/ProgressiveImage.tsx` - Fixed image transition handling
6. `apps/master/src/components/albums/editor2/AlbumEditor.tsx` - Fixed retouch done handler

## Verification

Build completed successfully with no TypeScript errors:
```
vite v7.3.1 building client environment for production...
✓ 2273 modules transformed.
✓ built in 53.94s
```
