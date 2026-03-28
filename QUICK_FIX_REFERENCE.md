# Quick Fix Reference - Album Editor

## 🚀 Quick Start (Apply All Fixes)

### Step 1: Apply Zoom Fix
```bash
cd E:\ClickFlash
git apply APPLY_ZOOM_FIX.patch --ignore-whitespace
```

### Step 2: Apply Retouch Fix
```bash
git apply APPLY_RETOUCH_FIX.patch --ignore-whitespace
```

### Step 3: Apply CSS Fix
```bash
git apply APPLY_CSS_FIX.patch --ignore-whitespace
```

### Step 4: Restart App
```bash
# In your terminal or use the bat files
cd apps/master
npm run dev
```

---

## 📋 Manual Fix Checklist

If patches don't apply cleanly, here are the key changes:

### 1. Zoom Fix (AlbumDetail.tsx)

**Add after line 140 (after zoomState declaration):**
```typescript
// Zoom ref to avoid stale closures
const zoomRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
useEffect(() => {
    zoomRef.current = zoomState;
}, [zoomState]);
```

**Replace handleZoom function (around line 978):**
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

**Replace handleWheel with useEffect (around line 1191):**
```typescript
// Remove the handleWheel callback entirely

// Add this useEffect instead:
useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    
    const handleWheelNative = (e: WheelEvent) => {
        if (isCropping || isRetouching) return;
        
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
        const cursorX = e.clientX - (imgRect.left + imgRect.width / 2);
        const cursorY = e.clientY - (imgRect.top + imgRect.height / 2);
        const unscaledX = cursorX / currentScale;
        const unscaledY = cursorY / currentScale;
        const newX = unscaledX * newScale;
        const newY = unscaledY * newScale;
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

**Remove onWheel from viewer div (around line 1623):**
```tsx
// Remove this prop:
onWheel={handleWheel}
```

### 2. Retouch Fix (AlbumDetail.tsx)

**Add after EditEngine initialization (after line 167):**
```typescript
// Canvas sizing effect
useEffect(() => {
    const syncCanvas = () => {
        if (!canvasRef.current || !imageRef.current || !viewerRef.current) return;
        
        const img = imageRef.current;
        const canvas = canvasRef.current;
        const viewer = viewerRef.current;
        
        const imgRect = img.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();
        
        canvas.style.position = 'absolute';
        canvas.style.left = `${imgRect.left - viewerRect.left}px`;
        canvas.style.top = `${imgRect.top - viewerRect.top}px`;
        canvas.style.width = `${imgRect.width}px`;
        canvas.style.height = `${imgRect.height}px`;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = imgRect.width * dpr;
        canvas.height = imgRect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
    };
    
    const timeoutId = setTimeout(syncCanvas, 100);
    window.addEventListener('resize', syncCanvas);
    
    return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', syncCanvas);
    };
}, [activePhoto?.id, activePhoto?.url]);

// Render retouch canvas
const renderRetouchCanvas = useCallback(async () => {
    if (!editEngineRef.current || !canvasRef.current) return;
    
    const edits = activePhoto?.manualEdits;
    
    if (!edits?.retouchActions?.length) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvasRef.current.width / dpr, canvasRef.current.height / dpr);
        }
        return;
    }
    
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
        logger.error('Failed to render retouch', err);
    }
}, [activePhoto?.url, activePhoto?.manualEdits]);

useEffect(() => {
    renderRetouchCanvas();
}, [activePhoto?.manualEdits?.retouchActions?.length, renderRetouchCanvas]);
```

**Simplify handleRetouchAt (replace entire function):**
```typescript
const handleRetouchAt = useCallback(async (clientX: number, clientY: number) => {
    if (!imageRef.current || !activePhoto) return;
    
    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    
    const relX = (clientX - imgRect.left) / imgRect.width;
    const relY = (clientY - imgRect.top) / imgRect.height;
    const clampedX = Math.max(0, Math.min(1, relX));
    const clampedY = Math.max(0, Math.min(1, relY));
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const imageX = Math.round(clampedX * natW);
    const imageY = Math.round(clampedY * natH);

    if (retouchStep === 'target') {
        setRetouchTarget({ x: clientX, y: clientY, imageX, imageY } as any);
        setRetouchStep('source');
        return;
    }
    
    if (retouchStep === 'source' && retouchTarget) {
        const newAction: RetouchAction = {
            id: crypto.randomUUID(),
            type: 'heal',
            x: (retouchTarget as any).imageX,
            y: (retouchTarget as any).imageY,
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

### 3. CSS Fix (AlbumDetail.css)

**Update zoom controls:**
```css
.zoom-controls-container {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    left: auto;
    transform: none;
    /* ... rest of styles ... */
}
```

**Update canvas overlay:**
```css
.edit-canvas-overlay {
    position: absolute;
    pointer-events: none;
    z-index: 10;
    /* Position/size set via JS */
}
```

---

## ✅ Testing Checklist

### Zoom
- [ ] Mouse wheel zooms in/out
- [ ] Zoom buttons work
- [ ] Zoom centers on cursor
- [ ] Pan works while zoomed
- [ ] Reset zoom works

### Retouch
- [ ] Click shows red target circle
- [ ] Second click applies heal
- [ ] Heal result is visible
- [ ] Multiple heals work
- [ ] Canvas resizes with window

### UI
- [ ] Zoom controls in bottom-right
- [ ] Controls don't block image
- [ ] Layout responsive

---

## 🐛 Troubleshooting

### Patch fails to apply?
```bash
# Try with 3-way merge
git apply --3way APPLY_ZOOM_FIX.patch

# Or apply manually with context
git apply --ignore-space-change --ignore-whitespace APPLY_ZOOM_FIX.patch
```

### Zoom still not working?
- Check browser console for errors
- Verify `viewerRef` is attached to the viewer div
- Ensure no CSS `overflow: hidden` is blocking events

### Retouch canvas not showing?
- Check that `canvasRef` is attached to the canvas element
- Verify EditEngine is initialized (check console logs)
- Ensure image has loaded before retouching

### Build errors?
```bash
# Clear and reinstall
cd apps/master
rm -rf node_modules
npm install
npm run dev
```
