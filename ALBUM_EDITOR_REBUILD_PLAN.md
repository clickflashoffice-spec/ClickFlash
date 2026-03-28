# Album Editor Complete Rebuild Plan

## Current Issues
- Zoom not functioning (stale closures, incorrect transform math)
- Retouch not rendering (canvas sizing, coordinate mapping issues)
- UI cluttered and confusing
- Complex coordinate transformation logic

## New Architecture

### Core Components
```
AlbumEditor/                     # New folder structure
├── AlbumEditor.tsx              # Main container
├── ImageViewer.tsx              # Image display with zoom/pan
├── RetouchCanvas.tsx            # Canvas overlay for healing
├── EditorToolbar.tsx            # Top toolbar (undo/redo, mode toggle)
├── EditorSidebar.tsx            # Right sidebar (adjustments)
├── Filmstrip.tsx                # Bottom thumbnail strip
├── ZoomControls.tsx             # Bottom-right zoom widget
└── hooks/
    ├── useZoom.ts               # Zoom/pan state management
    ├── useRetouch.ts            # Retouch tool state
    └── useImageTransform.ts     # CSS transform calculations
```

## Key Design Decisions

### 1. Zoom/Pan System
- Use CSS `transform: scale()` + `translate()` on a container div
- Store zoom state in a ref to avoid stale closures
- Use CSS custom properties for dynamic values
- Pan works by translating the container

### 2. Retouch System
- Single canvas element positioned exactly over the image
- Canvas sized to match displayed image dimensions (not natural size)
- Render base image to canvas, then apply edits
- Healing uses radial gradient mask for smooth blending

### 3. UI Layout (Studio Mode)
```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar (Undo/Redo | Studio Mode | AI Cull | Save | Done)   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌──────────────────────────────────────────┐  ┌───────┐ │
│    │                                          │  │       │ │
│    │         Image Viewer                     │  │  Side │ │
│    │         (with zoom/pan)                  │  │  bar  │ │
│    │                                          │  │       │ │
│    │    [Canvas Overlay for Retouch]          │  │       │ │
│    │                                          │  │       │ │
│    │                                    [+/-] │  │       │ │
│    └──────────────────────────────────────────┘  └───────┘ │
│    [←] [→] Navigation arrows                               │
├─────────────────────────────────────────────────────────────┤
│ Collapsible Filmstrip (thumbnails)                         │
└─────────────────────────────────────────────────────────────┘
```

### 4. State Management
- React Context for editor state (avoids prop drilling)
- Refs for values that need to be fresh (zoom, mouse position)
- useState for UI state (sidebar open, current tool)

## Implementation Steps

### Phase 1: Core Hooks
1. `useZoom.ts` - Zoom/pan logic with ref-based state
2. `useRetouch.ts` - Retouch tool state management
3. `useEditorContext.ts` - Global editor state

### Phase 2: Base Components
1. `ImageViewer.tsx` - Image with CSS transforms
2. `RetouchCanvas.tsx` - Canvas overlay system
3. `ZoomControls.tsx` - Zoom widget

### Phase 3: UI Components
1. `EditorToolbar.tsx` - Top toolbar
2. `EditorSidebar.tsx` - Right panel
3. `Filmstrip.tsx` - Bottom thumbnails

### Phase 4: Integration
1. `AlbumEditor.tsx` - Main container
2. Replace old AlbumDetail.tsx

## Technical Specifications

### Zoom Behavior
- Min zoom: 0.5x (50%)
- Max zoom: 5x (500%)
- Zoom increment: 0.25x (buttons), 0.15x (wheel)
- Zoom centers on cursor position
- Pan works at any zoom level (click and drag)

### Retouch Behavior
- Two-step process: click target (blemish), click source (clean area)
- Red circle shows target position
- Brush cursor follows mouse
- Healing applied immediately after second click
- Multiple heals can be stacked

### CSS Structure
```css
.editor-container {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
}

.viewer-area {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-container {
    transform: var(--zoom-transform);
    transform-origin: center center;
    transition: transform 0.1s ease-out;
}

.canvas-overlay {
    position: absolute;
    pointer-events: none;
}
```

## Benefits of New Architecture

1. **No Stale Closures** - Zoom state in refs, not useState dependencies
2. **Simpler Coordinate Math** - Direct proportional mapping
3. **Better Performance** - CSS transforms GPU-accelerated
4. **Cleaner Code** - Separated concerns, smaller components
5. **Maintainable** - Clear component boundaries and hooks
6. **Professional UI** - Studio-quality dark theme

## Migration Strategy

1. Create new `AlbumEditor/` folder
2. Build new components alongside existing ones
3. Test thoroughly in isolation
4. Swap AlbumDetail import to use new AlbumEditor
5. Remove old AlbumDetail.tsx
