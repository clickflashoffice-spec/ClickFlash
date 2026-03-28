# Album Editor Comprehensive Fix Plan

## Issues Analysis

### 1. Zoom Not Working
**Root Causes:**
- Stale closures in `handleZoom` callback due to `zoomState` dependency
- `e.preventDefault()` in wheel handler conflicts with React's synthetic events
- Transform calculation uses complex coordinate math that doesn't account for image centering
- Zoom buttons don't properly calculate center point

**Solution:**
- Use refs for zoom values to avoid stale closures
- Simplify transform to use CSS `transform: scale()` with `transform-origin: center`
- Remove complex offset calculations - let CSS handle centering
- Fix wheel event with proper passive:false handling

### 2. Spot Retouch Not Working
**Root Causes:**
- Canvas overlay sized to `inset:0` (full container) instead of matching image
- EditEngine initialized but render() never called with proper context
- Coordinate transformation doesn't account for CSS `object-fit: contain`
- No visual feedback for brush cursor position

**Solution:**
- Size canvas to match actual displayed image dimensions using `getBoundingClientRect()`
- Call EditEngine.render() whenever retouchActions change
- Implement proper screen-to-image coordinate conversion
- Add visible brush cursor that follows mouse

### 3. UI/UX Layout Issues
**Problems:**
- Excessive nested flex containers causing layout bugs
- Sidebar too narrow, controls cramped
- Zoom controls overlap image content
- Filmstrip height not adjustable
- No consistent spacing system

**Solution:**
- Implement CSS Grid for main layout areas
- Increase sidebar width to 360px minimum
- Move zoom controls to bottom-right corner
- Make filmstrip collapsible
- Apply consistent spacing scale

## Implementation Steps

### Step 1: Fix Zoom State Management
```typescript
// Use refs to avoid stale closures
const zoomRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
const setZoom = (newZoom) => {
    zoomRef.current = newZoom;
    setZoomState(newZoom); // For re-render
};
```

### Step 2: Simplify Transform
```typescript
// Instead of complex calculations, use CSS
const imageStyle = {
    transform: `scale(${zoom.scale}) translate(${zoom.offsetX}px, ${zoom.offsetY}px)`,
    transformOrigin: 'center center',
    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
};
```

### Step 3: Fix Canvas Sizing
```typescript
const syncCanvasToImage = () => {
    if (!imageRef.current || !canvasRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    canvasRef.current.width = rect.width;
    canvasRef.current.height = rect.height;
    canvasRef.current.style.width = `${rect.width}px`;
    canvasRef.current.style.height = `${rect.height}px`;
    canvasRef.current.style.left = `${rect.left - containerRect.left}px`;
    canvasRef.current.style.top = `${rect.top - containerRect.top}px`;
};
```

### Step 4: Fix Retouch Coordinates
```typescript
const screenToImageCoords = (screenX, screenY) => {
    const imgRect = imageRef.current.getBoundingClientRect();
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    
    // Calculate scale factor (object-fit: contain)
    const scaleX = naturalWidth / imgRect.width;
    const scaleY = naturalHeight / imgRect.height;
    
    // Convert screen coords to image coords
    const x = (screenX - imgRect.left) * scaleX;
    const y = (screenY - imgRect.top) * scaleY;
    
    return { x: Math.round(x), y: Math.round(y) };
};
```

## UI Redesign Mockup

```
+----------------------------------------------------------+
| Toolbar (Undo/Redo | Studio Mode | AI Cull | Save | Done)|
+----------------------------------------------------------+
|                                                          |
|    +---------------------------------------------+  +---+
|    |                                             |  | S |
|    |          Main Image Viewer                  |  | i |
|    |          (with zoom/pan)                    |  | d |
|    |                                             |  | e |
|    |                                             |  | b |
|    |    [Canvas Overlay for Retouch]             |  | a |
|    |                                             |  | r |
|    |                                     [Zoom]  |  |   |
|    +---------------------------------------------+  +---+
|    [←] [→] Navigation arrows                        |
+----------------------------------------------------------+
| Collapsible Filmstrip (thumbnails)                      |
+----------------------------------------------------------+
```

## Files to Modify

1. `AlbumDetail.tsx` - Main component logic
2. `AlbumDetail.css` - Styling improvements
3. `EditEngine.ts` - Canvas rendering fixes

## Testing Checklist

- [ ] Zoom in/out with mouse wheel
- [ ] Zoom in/out with buttons
- [ ] Pan when zoomed
- [ ] Reset zoom
- [ ] Spot healing (click target, click source)
- [ ] Brush cursor visibility
- [ ] Canvas sync on resize
- [ ] UI layout on different screen sizes
