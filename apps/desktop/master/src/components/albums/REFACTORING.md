# AlbumDetail Component Refactoring

## Overview

The `AlbumDetail.tsx` component (1,969 lines) is being refactored using a phased approach to improve maintainability without breaking existing functionality.

## Phase 1: Hook Extraction ✅

Created custom hooks to extract stateful logic:

### `hooks/usePhotoEditing.ts`
Manages photo editing state and operations:
- Manual edit state management
- Edit validation and clamping
- Batch edit operations (copy/paste)
- AI edit integration stub

### `hooks/useAlbumEditState.ts`
Manages album-level state and persistence:
- Album state management
- Pristine state tracking for dirty checking
- Auto-save with debouncing
- History/undo-redo management

### `hooks/useKeyboardShortcuts.ts`
Handles keyboard navigation and shortcuts:
- Photo navigation (arrow keys)
- Edit operations (undo/redo)
- Selection shortcuts (Ctrl+A)

## Phase 2: Component Extraction ✅

Created standalone components for the UI sections:

### `components/PhotoViewer.tsx`
Main image display area with:
- Zoom and pan support
- Grid overlay for straightening
- Crop box visualization
- Zoom level indicator

### `components/EditorToolbar.tsx`
Side panel editing controls:
- Light adjustments (Exposure, Contrast, Highlights, Shadows)
- Color adjustments (Saturation, Temperature, Tint)
- Detail adjustments (Sharpness, Rotation)
- Tool buttons (Crop, Retouch)
- Undo/Redo controls

### `components/Filmstrip.tsx`
Bottom photo strip with:
- Thumbnail grid with lazy loading
- Selection indicators
- Edit status badges
- Auto-scroll to active photo
- Multi-select support

### `components/CropOverlay.tsx`
Interactive cropping interface:
- Resizable crop box
- Rule of thirds grid
- Aspect ratio locking
- Apply/Cancel controls

## Integration Status

The new components are **ready to use** but not yet integrated into AlbumDetail.tsx. To complete the integration:

1. Replace the existing inline JSX with the new components
2. Wire up the props from the extracted hooks
3. Remove duplicate state management
4. Update tests to cover new component boundaries

## Migration Path

```typescript
// Current (monolithic)
const AlbumDetail = () => {
  // 25+ state declarations
  // 35+ event handlers
  return (
    // 500+ lines of JSX
  );
};

// Target (composed)
const AlbumDetail = () => {
  const { edits, applyEdits } = usePhotoEditing();
  const { album, isDirty, saveChanges } = useAlbumEditState(albumId);
  useKeyboardShortcuts({ onNext, onPrev, onSave });
  
  return (
    <div className="album-detail">
      <PhotoViewer photo={activePhoto} edits={edits} />
      <EditorToolbar edits={edits} onEditChange={applyEdits} />
      <Filmstrip photos={album.photos} activeIndex={activeIndex} />
      {isCropping && <CropOverlay onApply={handleCropApply} />}
    </div>
  );
};
```

## Benefits

1. **Reduced complexity**: Each component has a single responsibility
2. **Better testability**: Components can be tested in isolation
3. **Reusability**: Components like PhotoViewer can be used elsewhere
4. **Maintainability**: Changes are localized to specific components
5. **Performance**: Memoization is easier to apply at component boundaries

## Next Steps

1. Gradually migrate sections of AlbumDetail.tsx
2. Add unit tests for each new component
3. Add integration tests for the composed AlbumDetail
4. Consider further splitting EditorSidebar into smaller pieces
