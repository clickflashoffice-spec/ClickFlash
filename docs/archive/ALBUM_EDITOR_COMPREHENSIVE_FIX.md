# Album Editor - Comprehensive Fix Implementation

## Executive Summary

This document contains the complete fix for three critical issues in the Album Editor:
1. **Zoom not working** - Stale closures and incorrect transform calculations
2. **Spot retouch not rendering** - Canvas sizing and coordinate transformation bugs
3. **UI/UX layout issues** - Poor layout structure and control positioning

---

## Issue 1: Zoom Not Working

### Root Causes

1. **Stale Closures**: The `handleZoom` and `handleWheel` callbacks depend on `zoomState`, creating a closure that captures the state at render time. When the callback executes, it uses the old state value.

2. **Complex Transform Math**: The current implementation tries to manually calculate offsets for zoom-to-cursor, but the math doesn't account for the image's actual position within the viewer when using `object-fit: contain`.

3. **Wheel Event Handling**: React's synthetic events and the `passive: true` default on wheel listeners cause `preventDefault()` to fail silently.

### The Fix

```typescript
// Replace the zoom state management in AlbumDetail.tsx

// 1. Add zoom ref to avoid stale closures
const zoomRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

// 2. Sync ref with state
useEffect(() => {
    zoomRef.current = zoomState;
}, [zoomState]);

// 3. Simplified zoom handler without stale closure issues
const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (isCropping) return;
    
    if (direction === 'reset') {
        setZoomState({ scale: 1, offsetX: 0, offsetY: 0 });
        return;
    }
    
    const currentScale = zoomRef.current.scale;
    const scaleAmount = 0.25;
    const newScale = direction === 'in'
        ? Math.min(5, currentScale + scaleAmount)
        : Math.max(0.5, currentScale - scaleAmount);
    
    // When zooming, center on the current viewport center
    if (newScale !== currentScale) {
        setZoomState(prev => ({
            ...prev,
            scale: newScale
        }));
    }
}, [isCropping]); // No zoomState dependency!

// 4. Fixed wheel handler with proper passive handling
useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    
    const handleWheelNative = (e: WheelEvent) => {
        if (isCropping || isRetouching) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const delta = -Math.sign(e.deltaY) * 0.15;
        const currentScale = zoomRef.current.scale;
        const newScale = Math.max(0.5, Math.min(5, currentScale + delta));
        
        if (Math.abs(newScale - currentScale) < 0.01) return;
        
        // Get image position
        const img = imageRef.current;
        if (!img) {
            setZoomState(prev => ({ ...prev, scale: newScale }));
            return;
        }
        
        const imgRect = img.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();
        
        // Calculate cursor position relative to image center
        const cursorX = e.clientX - (imgRect.left + imgRect.width / 2);
        const cursorY = e.clientY - (imgRect.top + imgRect.height / 2);
        
        // Calculate the position in "unscaled" space
        const unscaledX = cursorX / currentScale;
        const unscaledY = cursorY / currentScale;
        
        // New position after scale change
        const newX = unscaledX * newScale;
        const newY = unscaledY * newScale;
        
        // Adjust offset to keep cursor point stationary
        const currentOffsetX = zoomRef.current.offsetX;
        const currentOffsetY = zoomRef.current.offsetY;
        
        setZoomState({
            scale: newScale,
            offsetX: currentOffsetX + (cursorX - newX),
            offsetY: currentOffsetY + (cursorY - newY)
        });
    };
    
    // Add non-passive listener
    viewer.addEventListener('wheel', handleWheelNative, { passive: false });
    
    return () => {
        viewer.removeEventListener('wheel', handleWheelNative);
    };
}, [isCropping, isRetouching]);
```

### CSS Transform Fix

```css
/* In AlbumDetail.css - Simplify the transform */
.hires-image {
    /* Existing properties... */
    transform: var(--image-transform);
    transform-origin: center center;
    transition: transform 0.1s ease-out;
}
```

---

## Issue 2: Spot Retouch Not Rendering

### Root Causes

1. **Canvas Sizing**: The canvas overlay uses `inset: 0` which makes it fill the entire viewer, not just the displayed image area. This causes coordinate mismatches.

2. **No Render Trigger**: The `EditEngine.render()` is never called when retouch actions change. The effect at line 1020 only has a comment saying "Phase 2".

3. **Complex Coordinate Math**: The inverse rotation transform is unnecessary complexity. We can use simple screen-to-element coordinate mapping.

4. **Canvas Context Loss**: The canvas context may be lost or cleared when the component re-renders.

### The Fix

```typescript
// 1. Add canvas sizing effect
useEffect(() => {
    const syncCanvas = () => {
        if (!canvasRef.current || !imageRef.current || !viewerRef.current) return;
        
        const img = imageRef.current;
        const canvas = canvasRef.current;
        const viewer = viewerRef.current;
        
        const imgRect = img.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();
        
        // Position canvas exactly over the displayed image
        canvas.style.position = 'absolute';
        canvas.style.left = `${imgRect.left - viewerRect.left}px`;
        canvas.style.top = `${imgRect.top - viewerRect.top}px`;
        canvas.style.width = `${imgRect.width}px`;
        canvas.style.height = `${imgRect.height}px`;
        
        // Set actual canvas dimensions (consider devicePixelRatio for retina)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = imgRect.width * dpr;
        canvas.height = imgRect.height * dpr;
        
        // Scale context for retina displays
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        
        // Re-render if we have an engine
        if (editEngineRef.current && activePhoto?.url) {
            renderRetouchCanvas();
        }
    };
    
    // Sync on mount and when image loads
    syncCanvas();
    
    // Also sync on window resize
    window.addEventListener('resize', syncCanvas);
    return () => window.removeEventListener('resize', syncCanvas);
}, [activePhoto?.id, activePhoto?.url]);

// 2. Render function for retouch canvas
const renderRetouchCanvas = useCallback(async () => {
    if (!editEngineRef.current || !canvasRef.current || !imageRef.current) return;
    
    const img = imageRef.current;
    const edits = activePhoto?.manualEdits;
    
    // Only render if we have retouch actions
    if (!edits?.retouchActions?.length) {
        // Clear canvas
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        return;
    }
    
    // Create a temporary image at the canvas size for the engine
    const canvasWidth = canvasRef.current.width / (window.devicePixelRatio || 1);
    const canvasHeight = canvasRef.current.height / (window.devicePixelRatio || 1);
    
    // Load image and render
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.src = activePhoto.url!;
    
    await new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
    });
    
    // Render through EditEngine
    await editEngineRef.current.render(tempImg, edits);
    
}, [activePhoto?.url, activePhoto?.manualEdits]);

// 3. Effect to trigger render when edits change
useEffect(() => {
    if (activePhoto?.manualEdits?.retouchActions?.length) {
        renderRetouchCanvas();
    }
}, [activePhoto?.manualEdits?.retouchActions, renderRetouchCanvas]);

// 4. Simplified coordinate mapping for retouch
const handleRetouchAt = useCallback(async (clientX: number, clientY: number) => {
    if (!imageRef.current || !activePhoto) return;
    
    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    
    // Simple mapping: screen coords -> relative coords (0-1) -> image coords
    const relX = (clientX - imgRect.left) / imgRect.width;
    const relY = (clientY - imgRect.top) / imgRect.height;
    
    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(1, relX));
    const clampedY = Math.max(0, Math.min(1, relY));
    
    // Convert to natural image coordinates
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const imageX = clampedX * natW;
    const imageY = clampedY * natH;
    
    // Store both screen and image coords
    if (retouchStep === 'target') {
        setRetouchTarget({ 
            x: clientX, 
            y: clientY, 
            imageX, 
            imageY 
        } as any);
        setRetouchStep('source');
        return;
    }
    
    if (retouchStep === 'source' && retouchTarget) {
        const newAction: RetouchAction = {
            id: crypto.randomUUID(),
            type: 'heal',
            // @ts-ignore
            x: retouchTarget.imageX,
            // @ts-ignore
            y: retouchTarget.imageY,
            radius: brushSize,
            sourceX: imageX,
            sourceY: imageY,
            timestamp: Date.now()
        };
        
        // Add to metadata
        updateAlbumState(draft => {
            const photo = (draft.photos || []).find(p => p.id === activePhoto.id);
            if (photo) {
                if (!photo.manualEdits) photo.manualEdits = { ...INITIAL_EDITS };
                if (!photo.manualEdits.retouchActions) photo.manualEdits.retouchActions = [];
                photo.manualEdits.retouchActions.push(newAction);
                photo._metadataModified = true;
            }
        });
        
        setRetouchStep('target');
        setRetouchTarget(null);
    }
}, [activePhoto, brushSize, retouchStep, retouchTarget, updateAlbumState]);
```

### Canvas CSS Fix

```css
/* In AlbumDetail.css */
.edit-canvas-overlay {
    position: absolute;
    pointer-events: none;
    z-index: 10;
    /* Remove inset: 0 - we set position via JS */
    /* Remove object-fit: contain - canvas matches image exactly */
}
```

---

## Issue 3: UI/UX Layout Improvements

### Problems

1. Zoom controls at top center can overlap image content
2. Sidebar in studio mode is floating with fixed positioning
3. Filmstrip takes too much vertical space
4. No consistent spacing system

### The Fix

```css
/* AlbumDetail.css - Add these improvements */

/* 1. Move zoom controls to bottom-right */
.zoom-controls-container {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    /* Remove left: 50% and transform: translateX(-50%) */
    left: auto;
    transform: none;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background-color: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(16px);
    border-radius: 9999px;
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* 2. Improved sidebar positioning */
.editor-sidebar-container {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 360px;
    z-index: 30;
    transition: transform 0.3s ease;
}

.editor-sidebar-container.collapsed {
    transform: translateX(100%);
}

/* 3. Collapsible filmstrip */
.filmstrip-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    z-index: 30;
    transition: transform 0.3s ease;
}

.filmstrip-container.collapsed {
    transform: translateY(100%);
}

/* 4. Better main layout using CSS Grid */
.editor-layout {
    display: grid;
    grid-template-rows: auto 1fr auto;
    grid-template-columns: 1fr;
    height: 100vh;
    overflow: hidden;
}

.editor-layout.with-sidebar {
    grid-template-columns: 1fr 360px;
}

/* 5. Improved viewer area */
.viewer-area {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}
```

### Component Structure Improvements

```tsx
// Simplified layout structure in AlbumDetail.tsx return statement

<div className="editor-layout">
    {/* Header */}
    <header className="editor-toolbar">
        {/* Toolbar content */}
    </header>
    
    {/* Main Content */}
    <main className="viewer-area">
        {/* Image and canvas */}
        <HiResImage ... />
        <canvas ref={canvasRef} className="edit-canvas-overlay" />
        
        {/* Navigation arrows */}
        <button className="nav-arrow left">...</button>
        <button className="nav-arrow right">...</button>
        
        {/* Zoom controls - bottom right */}
        <div className="zoom-controls-container">
            {/* Zoom buttons */}
        </div>
        
        {/* Studio HUD */}
        {isStudioMode && <div className="studio-hud">...</div>}
    </main>
    
    {/* Sidebar - conditionally rendered */}
    {showEditorToolbox && (
        <aside className="editor-sidebar-container">
            <EditorSidebar ... />
        </aside>
    )}
    
    {/* Filmstrip */}
    {showFilmstrip && (
        <div className="filmstrip-container">
            <VirtualFilmstrip ... />
        </div>
    )}
</div>
```

---

## Complete Code Changes

### File: `apps/master/src/components/albums/AlbumDetail.tsx`

#### Section 1: Add zoomRef and update zoom handlers (around line 140)

```typescript
// Add after line 140
const zoomRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

// Sync ref with state
useEffect(() => {
    zoomRef.current = zoomState;
}, [zoomState]);
```

#### Section 2: Replace handleZoom (around line 978)

Replace the entire `handleZoom` function with:

```typescript
const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (isCropping) return;
    
    if (direction === 'reset') {
        setZoomState({ scale: 1, offsetX: 0, offsetY: 0 });
        return;
    }
    
    const currentScale = zoomRef.current.scale;
    const scaleAmount = 0.25;
    const newScale = direction === 'in'
        ? Math.min(5, currentScale + scaleAmount)
        : Math.max(0.5, currentScale - scaleAmount);
    
    if (newScale !== currentScale) {
        setZoomState(prev => ({
            ...prev,
            scale: newScale
        }));
    }
}, [isCropping]);
```

#### Section 3: Replace wheel handler with native event (around line 1191)

Remove the `handleWheel` callback and replace with a useEffect:

```typescript
// Remove this:
// const handleWheel = useCallback((e: React.WheelEvent) => { ... }, [isCropping, isRetouching, zoomState]);

// Add this useEffect instead:
useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    
    const handleWheelNative = (e: WheelEvent) => {
        if (isCropping || isRetouching) return;
        
        // Only handle if hovering over the viewer
        const rect = viewer.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) {
            return;
        }
        
        e.preventDefault();
        
        const delta = -Math.sign(e.deltaY) * 0.15;
        const currentScale = zoomRef.current.scale;
        const newScale = Math.max(0.5, Math.min(5, currentScale + delta));
        
        if (Math.abs(newScale - currentScale) < 0.01) return;
        
        const img = imageRef.current;
        if (!img) {
            setZoomState(prev => ({ ...prev, scale: newScale }));
            return;
        }
        
        const imgRect = img.getBoundingClientRect();
        
        // Calculate cursor position relative to image center
        const cursorX = e.clientX - (imgRect.left + imgRect.width / 2);
        const cursorY = e.clientY - (imgRect.top + imgRect.height / 2);
        
        // Calculate the position in "unscaled" space
        const unscaledX = cursorX / currentScale;
        const unscaledY = cursorY / currentScale;
        
        // New position after scale change
        const newX = unscaledX * newScale;
        const newY = unscaledY * newScale;
        
        // Adjust offset to keep cursor point stationary
        const currentOffsetX = zoomRef.current.offsetX;
        const currentOffsetY = zoomRef.current.offsetY;
        
        setZoomState({
            scale: newScale,
            offsetX: currentOffsetX + (cursorX - newX),
            offsetY: currentOffsetY + (cursorY - newY)
        });
    };
    
    viewer.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => viewer.removeEventListener('wheel', handleWheelNative);
}, [isCropping, isRetouching]);
```

#### Section 4: Add canvas sizing effect (after line 159)

```typescript
// Add after the EditEngine initialization effect
useEffect(() => {
    const syncCanvas = () => {
        if (!canvasRef.current || !imageRef.current || !viewerRef.current) return;
        
        const img = imageRef.current;
        const canvas = canvasRef.current;
        const viewer = viewerRef.current;
        
        const imgRect = img.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();
        
        // Position canvas exactly over the displayed image
        canvas.style.position = 'absolute';
        canvas.style.left = `${imgRect.left - viewerRect.left}px`;
        canvas.style.top = `${imgRect.top - viewerRect.top}px`;
        canvas.style.width = `${imgRect.width}px`;
        canvas.style.height = `${imgRect.height}px`;
        
        // Set actual canvas dimensions
        const dpr = window.devicePixelRatio || 1;
        canvas.width = imgRect.width * dpr;
        canvas.height = imgRect.height * dpr;
        
        // Scale context for retina
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
    };
    
    // Sync on mount and when image loads/changes
    syncCanvas();
    
    // Also sync on resize
    window.addEventListener('resize', syncCanvas);
    
    // Sync when image loads
    const img = imageRef.current;
    if (img) {
        img.addEventListener('load', syncCanvas);
    }
    
    return () => {
        window.removeEventListener('resize', syncCanvas);
        if (img) {
            img.removeEventListener('load', syncCanvas);
        }
    };
}, [activePhoto?.id]);
```

#### Section 5: Add render function and effect (after line 1028)

```typescript
// Render retouch canvas
const renderRetouchCanvas = useCallback(async () => {
    if (!editEngineRef.current || !canvasRef.current || !imageRef.current) return;
    
    const edits = activePhoto?.manualEdits;
    
    // Clear if no retouch actions
    if (!edits?.retouchActions?.length) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvasRef.current.width / dpr, canvasRef.current.height / dpr);
        }
        return;
    }
    
    // Load image for rendering
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.src = activePhoto?.url || '';
    
    try {
        await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = reject;
        });
        
        await editEngineRef.current.render(tempImg, edits);
    } catch (err) {
        logger.error('Failed to render retouch canvas', err);
    }
}, [activePhoto?.url, activePhoto?.manualEdits]);

// Effect to trigger render when edits change
useEffect(() => {
    renderRetouchCanvas();
}, [activePhoto?.manualEdits?.retouchActions?.length, renderRetouchCanvas]);
```

#### Section 6: Simplify handleRetouchAt (replace lines 1030-1148)

```typescript
const handleRetouchAt = useCallback(async (clientX: number, clientY: number) => {
    if (!imageRef.current || !activePhoto) return;
    
    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    
    // Simple mapping: screen coords -> relative coords (0-1) -> image coords
    const relX = (clientX - imgRect.left) / imgRect.width;
    const relY = (clientY - imgRect.top) / imgRect.height;
    
    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(1, relX));
    const clampedY = Math.max(0, Math.min(1, relY));
    
    // Convert to natural image coordinates
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const imageX = Math.round(clampedX * natW);
    const imageY = Math.round(clampedY * natH);
    
    if (retouchStep === 'target') {
        setRetouchTarget({ 
            x: clientX, 
            y: clientY, 
            imageX, 
            imageY 
        } as any);
        setRetouchStep('source');
        return;
    }
    
    if (retouchStep === 'source' && retouchTarget) {
        const newAction: RetouchAction = {
            id: crypto.randomUUID(),
            type: 'heal',
            // @ts-ignore
            x: retouchTarget.imageX,
            // @ts-ignore
            y: retouchTarget.imageY,
            radius: brushSize,
            sourceX: imageX,
            sourceY: imageY,
            timestamp: Date.now()
        };
        
        updateAlbumState(draft => {
            const photo = (draft.photos || []).find(p => p.id === activePhoto.id);
            if (photo) {
                if (!photo.manualEdits) photo.manualEdits = { ...INITIAL_EDITS };
                if (!photo.manualEdits.retouchActions) photo.manualEdits.retouchActions = [];
                photo.manualEdits.retouchActions.push(newAction);
                photo._metadataModified = true;
            }
        });
        
        setRetouchStep('target');
        setRetouchTarget(null);
    }
}, [activePhoto, brushSize, retouchStep, retouchTarget, updateAlbumState]);
```

#### Section 7: Remove onWheel from viewer div (around line 1623)

```tsx
// Remove the onWheel prop from the viewer div
<div
    ref={viewerRef}
    className={...}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUpOrLeave}
    onMouseLeave={handleMouseUpOrLeave}
    // REMOVE: onWheel={handleWheel}
>
```

---

### File: `apps/master/src/components/albums/AlbumDetail.css`

#### Section 1: Update zoom controls position

```css
.zoom-controls-container {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    left: auto;
    transform: none;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background-color: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(16px);
    border-radius: 9999px;
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

#### Section 2: Update canvas overlay

```css
.edit-canvas-overlay {
    position: absolute;
    pointer-events: none;
    z-index: 10;
    /* Position set via JS to match image exactly */
}
```

---

### File: `apps/master/src/utils/canvas/EditEngine.ts`

The EditEngine is mostly correct, but we need to ensure it handles the canvas context properly:

```typescript
// Add a method to handle context loss/recovery
public setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
}

// Update render method to handle scaling
public async render(img: HTMLImageElement | HTMLCanvasElement, edits: ManualEdits) {
    const { width, height } = this.ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = width / dpr;
    const displayHeight = height / dpr;
    
    // Clear Canvas
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // Draw Base Image scaled to display size
    this.ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    
    // Apply Retouch Actions
    if (edits.retouchActions?.length) {
        this.applyRetouchActions(edits.retouchActions, img.naturalWidth / displayWidth);
    }
}

// Update heal to account for scale
private heal(action: RetouchAction, scale: number = 1) {
    const { x, y, radius, sourceX, sourceY } = action;
    
    if (sourceX === undefined || sourceY === undefined) return;
    
    // Scale coordinates to canvas size
    const scaledX = x / scale;
    const scaledY = y / scale;
    const scaledSourceX = sourceX / scale;
    const scaledSourceY = sourceY / scale;
    const scaledRadius = radius / scale;
    
    const patchSize = scaledRadius * 2;
    const sx = scaledSourceX - scaledRadius;
    const sy = scaledSourceY - scaledRadius;
    const tx = scaledX - scaledRadius;
    const ty = scaledY - scaledRadius;
    
    // ... rest of healing logic with scaled values
}
```

---

## Testing Checklist

### Zoom Functionality
- [ ] Mouse wheel zoom in works
- [ ] Mouse wheel zoom out works
- [ ] Zoom buttons work
- [ ] Zoom-to-cursor works correctly
- [ ] Reset zoom works
- [ ] Pan while zoomed works
- [ ] Zoom works after switching photos

### Spot Retouch
- [ ] Canvas is sized correctly when image loads
- [ ] Canvas repositions on window resize
- [ ] Clicking sets target (red circle appears)
- [ ] Second click sets source and applies heal
- [ ] Heal result is visible on canvas
- [ ] Multiple heals stack correctly
- [ ] Retouch is saved with photo metadata

### UI/UX
- [ ] Zoom controls are in bottom-right corner
- [ ] Controls don't overlap image content
- [ ] Sidebar can be toggled
- [ ] Filmstrip can be toggled
- [ ] Layout works on different screen sizes
- [ ] Studio mode looks correct

---

## Summary

This fix addresses:

1. **Zoom**: By using refs to avoid stale closures and native wheel events to ensure proper preventDefault behavior.

2. **Spot Retouch**: By properly sizing and positioning the canvas overlay, implementing the render effect, and simplifying coordinate mapping.

3. **UI/UX**: By repositioning zoom controls, improving the layout structure, and making panels collapsible.

All changes are minimal and focused on fixing the specific issues without rewriting the entire component.
