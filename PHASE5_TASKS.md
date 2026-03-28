# Phase 5 Tasks - Interactive Tools & Zoom

## Quick Reference

| # | Task | File | Est. Time | Status |
|---|------|------|-----------|--------|
| 5.1 | Create useZoomPan hook | `hooks/useZoomPan.ts` | 2-3h | ⬜ |
| 5.2 | Add ZoomControls component | `controls/ZoomControls.tsx` | 1-2h | ⬜ |
| 5.3 | Add tabs to SidebarControls | `controls/SidebarControls.tsx` | 2-3h | ⬜ |
| 5.4 | Integrate zoom into EditorCanvas | `canvas/EditorCanvas.tsx` | 3-4h | ⬜ |
| 5.5 | Integrate CropOverlay | `canvas/EditorCanvas.tsx` | 4-5h | ⬜ |
| 5.6 | Integrate RetouchCanvas | `canvas/EditorCanvas.tsx` | 3-4h | ⬜ |

**Total Estimated Time: 15-21 hours**

---

## Task 5.1: Create useZoomPan Hook

### Requirements
- Scale range: 0.1 (10%) to 5.0 (500%)
- Wheel zoom with Ctrl/Cmd
- Pan with space+drag or click+drag when zoomed
- Smooth transitions (200ms ease-out)

### Code Template
```typescript
export const useZoomPan = () => {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    const zoomIn = () => setScale(s => Math.min(s * 1.2, 5));
    const zoomOut = () => setScale(s => Math.max(s / 1.2, 0.1));
    const resetZoom = () => { setScale(1); setOffset({ x: 0, y: 0 }); };
    
    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.deltaY < 0 ? zoomIn() : zoomOut();
        }
    };
    
    // ... pan handlers
    
    return { scale, offset, zoomIn, zoomOut, resetZoom, handlers };
};
```

### Checklist
- [ ] Hook created
- [ ] Wheel zoom works
- [ ] Pan works when zoomed
- [ ] Constraints enforced
- [ ] Smooth transitions

---

## Task 5.2: Create ZoomControls Component

### UI Design
```
┌─────────────────┐
│      ┌───┐      │
│      │ + │      │  Zoom In
│      ├───┤      │
│      │100│      │  Current %
│      ├───┤      │
│      │ - │      │  Zoom Out
│      ├───┤      │
│      │ ⊘ │      │  Reset
│      └───┘      │
└─────────────────┘
```

### Props
```typescript
interface ZoomControlsProps {
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}
```

### Checklist
- [ ] Component created
- [ ] Shows current zoom %
- [ ] Buttons functional
- [ ] Positioned bottom-right
- [ ] Dark theme styling

---

## Task 5.3: Add Tabs to SidebarControls

### Tab Structure
```
┌─────────────────────────────────┐
│ [Adjust] [Crop] [Retouch] [AI]  │
├─────────────────────────────────┤
│                                 │
│  Tab Content                    │
│                                 │
└─────────────────────────────────┘
```

### Tab Contents
| Tab | Content |
|-----|---------|
| Adjust | Existing sliders (Exposure, Contrast, etc.) |
| Crop | Aspect ratio buttons + Apply/Cancel |
| Retouch | Brush size slider + Heal/Clone toggle |
| AI | Auto Enhance button |

### Checklist
- [ ] Tab bar component
- [ ] Active tab state
- [ ] Tab switching works
- [ ] Content panels
- [ ] Active tab styling

---

## Task 5.4: Integrate Zoom into EditorCanvas

### Changes to EditorCanvas
```typescript
export const EditorCanvas = () => {
    const { scale, offset, handlers, zoomIn, zoomOut, resetZoom } = useZoomPan();
    
    return (
        <div className="absolute inset-0" {...handlers}>
            <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
                <PhotoRenderer />
            </div>
            <ZoomControls scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
        </div>
    );
};
```

### Checklist
- [ ] Hook integrated
- [ ] Transform applied
- [ ] Zoom controls rendered
- [ ] Works with existing filters
- [ ] Works with overlays

---

## Task 5.5: Integrate CropOverlay

### Existing Component
Use: `apps/master/src/components/albums/components/CropOverlay.tsx`

### Integration Points
- Show when `activeTab === 'crop'`
- Overlay positioned over PhotoRenderer
- Sync crop rect with `edits.crop`
- Aspect ratio presets in sidebar

### State Flow
```
User clicks Crop tab
    ↓
Show CropOverlay
    ↓
User drags handles
    ↓
Update local cropRect state
    ↓
User clicks Apply
    ↓
Update edits.crop in parent
    ↓
Hide CropOverlay
```

### Checklist
- [ ] CropOverlay renders
- [ ] Handles draggable
- [ ] Aspect ratios work
- [ ] Apply/Cancel functional
- [ ] Crop applies to image

---

## Task 5.6: Integrate RetouchCanvas

### Existing Component
Use: `apps/master/src/components/albums/editor2/RetouchCanvas.tsx`

### Integration Points
- Show when `activeTab === 'retouch'`
- Brush size control in sidebar
- Healing/Clone tool toggle

### State Flow
```
User clicks Retouch tab
    ↓
Show RetouchCanvas
    ↓
User adjusts brush size
    ↓
Update brushSize state
    ↓
User clicks on blemish
    ↓
Apply healing effect
    ↓
Add to annotations list
```

### Checklist
- [ ] RetouchCanvas renders
- [ ] Brush size control works
- [ ] Tool toggle works
- [ ] Healing applies
- [ ] Annotations saved

---

## Testing Checklist

### Zoom/Pan
- [ ] Ctrl+Wheel zooms
- [ ] Space+drag pans
- [ ] Click+drag pans when zoomed
- [ ] Double-click resets
- [ ] Min zoom 10%
- [ ] Max zoom 500%
- [ ] Smooth transitions

### Tabs
- [ ] All tabs visible
- [ ] Tab switching works
- [ ] Correct content shown
- [ ] Active tab highlighted

### Crop
- [ ] Overlay appears on Crop tab
- [ ] Handles resize crop area
- [ ] Aspect ratio buttons work
- [ ] Apply saves crop
- [ ] Cancel discards changes

### Retouch
- [ ] Canvas appears on Retouch tab
- [ ] Brush size adjustable
- [ ] Heal tool works
- [ ] Clone tool works
- [ ] Done button saves

---

## Notes

### Priority Order
1. useZoomPan hook (foundation)
2. ZoomControls (UI)
3. Sidebar tabs (navigation)
4. Canvas integration (combine)
5. Crop tool (feature)
6. Retouch tool (feature)

### Dependencies
- Task 5.1 must complete before 5.4
- Task 5.3 must complete before 5.5, 5.6
- Task 5.4 must complete before 5.5, 5.6

### Existing Code to Reuse
- `CropOverlay.tsx` - Full crop implementation
- `RetouchCanvas.tsx` - Full retouch implementation
- `useRetouch.ts` - Retouch state management

---

*Ready for development start*
