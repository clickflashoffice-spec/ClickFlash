# Send to Kiosk & Categories - Implementation Guide

## Overview
Based on analysis of the old AlbumDetail.tsx, here's how the mechanisms work:

---

## 1. SEND TO KIOSK Mechanism

### Flow:
1. User selects photos in filmstrip (checkboxes)
2. User clicks "Send to Kiosk" button in sidebar
3. A modal opens showing available kiosks (fetched from API)
4. User selects which kiosk(s) to send to
5. User clicks "Finalize & Send"
6. System:
   - Copies photos to kiosk(s) via `apiService.sendAlbumToKiosk()`
   - Shows progress during copy
   - Updates album status to 'Finalized'
   - Shows success/error toast

### Key State:
```typescript
const [kiosks, setKiosks] = useState<any[]>([]);
const [selectedKioskIds, setSelectedKioskIds] = useState<Set<string>>(new Set());
const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
const [sendingProgress, setSendingProgress] = useState({
    open: false,
    progress: 0,
    message: '',
    current: 0,
    total: 0,
    destination: ''
});
```

### API Calls:
```typescript
// Load available kiosks on mount
const kiosks = await apiService.getKiosks();

// Send photos to kiosk
const result = await apiService.sendAlbumToKiosk(album.id, kioskId, photoIds);

// Update album status
await apiService.updateAlbum(album.id, { status: 'Finalized' });
```

### UI Components Needed:
1. **Kiosk Selection Modal**
   - List of available kiosks with checkboxes
   - Select All / Clear buttons
   - Kiosk status indicators (Connected/Offline)
   - Confirm button

2. **Progress Overlay**
   - Shows copy progress
   - Current file / Total files
   - Cancel option

---

## 2. CATEGORIES Mechanism

### Categories List:
```typescript
const PHOTO_CATEGORIES = [
    'Beach & Pool',
    'Photo Session', 
    'Evening',
    'Activities',
    'Restaurant'
];
```

### Flow:
1. User selects photos in filmstrip
2. User clicks a category button in sidebar
3. All selected photos get that category assigned
4. Toast confirms the action

### Implementation:
```typescript
const handleCategorizeSelected = (category: string) => {
    if (selectedPhotoIds.size === 0) return;
    
    updateAlbumState(draft => {
        draft.photos.forEach((p: Photo) => {
            if (selectedPhotoIds.has(p.id)) {
                p.category = category;
            }
        });
    });
    
    showToast(`Categorized ${selectedPhotoIds.size} photos as ${category}.`);
};
```

### UI:
- Grid of category buttons in sidebar
- Disabled when no selection
- Shows count of selected photos

---

## 3. Current New Editor Implementation

### What's Already Done:
- ✅ Basic "Send to Kiosk" button (stub)
- ✅ Basic "Set Category" button (stub)
- ✅ Selection mechanism via filmstrip
- ✅ Selection count badge

### What's Missing:
- ❌ Kiosk list loading
- ❌ Kiosk selection modal
- ❌ Progress overlay during send
- ❌ Category grid/buttons
- ❌ Actual API integration

---

## 4. Implementation Plan for New Editor

### Step 1: Add Kiosk State
```typescript
// In AlbumEditor.tsx
const [kiosks, setKiosks] = useState<any[]>([]);
const [selectedKioskIds, setSelectedKioskIds] = useState<Set<string>>(new Set());
const [showKioskModal, setShowKioskModal] = useState(false);
const [sendingProgress, setSendingProgress] = useState({
    open: false,
    progress: 0,
    message: '',
    current: 0,
    total: 0,
    destination: ''
});

// Load kiosks on mount
useEffect(() => {
    const loadKiosks = async () => {
        try {
            const data = await apiService.getKiosks();
            setKiosks(data || []);
        } catch (err) {
            console.error('Failed to load kiosks', err);
        }
    };
    loadKiosks();
}, []);
```

### Step 2: Create KioskSelectionModal Component
- List kiosks with checkboxes
- Select All / Clear buttons
- Show kiosk status
- Confirm/Cancel buttons

### Step 3: Create SendingProgress Component
- Progress bar
- Current/total count
- Destination name
- Cancel button

### Step 4: Implement Categories in Sidebar
- Grid of category buttons
- Import PHOTO_CATEGORIES from constants
- Disable when no selection

### Step 5: Implement Send Handler
```typescript
const handleSendToKiosk = async () => {
    if (selectedPhotoIds.size === 0) {
        showToast('Please select photos first');
        return;
    }
    
    // If multiple kiosks, show selection modal
    if (kiosks.length > 1) {
        setShowKioskModal(true);
        return;
    }
    
    // If only one kiosk, send directly
    if (kiosks.length === 1) {
        await sendToKiosks([kiosks[0].id]);
    } else {
        showToast('No kiosks available');
    }
};

const sendToKiosks = async (kioskIds: string[]) => {
    setSendingProgress({ open: true, progress: 0, message: 'Starting...', current: 0, total: selectedPhotoIds.size });
    
    try {
        for (const kioskId of kioskIds) {
            await apiService.sendAlbumToKiosk(album.id, kioskId, Array.from(selectedPhotoIds));
        }
        
        // Update album status
        await apiService.updateAlbum(album.id, { status: 'Finalized' });
        setAlbum(prev => prev ? { ...prev, status: 'Finalized' } : null);
        
        showToast(`Sent to ${kioskIds.length} kiosk(s)`);
    } catch (err) {
        showToast('Failed to send to kiosk');
    } finally {
        setSendingProgress(prev => ({ ...prev, open: false }));
    }
};
```

---

## 5. Files to Modify

### AlbumEditor.tsx
- Add kiosk state
- Add sending progress state
- Implement send handlers
- Add modal rendering

### EditorSidebar.tsx
- Add category grid
- Import PHOTO_CATEGORIES
- Wire up handlers

### New Files:
- `KioskSelectionModal.tsx` - Modal for selecting kiosks
- `SendingProgress.tsx` - Progress overlay

---

## 6. API Methods Needed

```typescript
// From apiService
apiService.getKiosks(): Promise<Kiosk[]>
apiService.sendAlbumToKiosk(albumId: string, kioskId: string, photoIds: string[]): Promise<SendResult>
apiService.updateAlbum(albumId: string, data: Partial<Album>): Promise<Album>
```

---

## 7. UI Layout (Sidebar)

```
┌─ Batch Actions ──────────┐
│ Selected: 5              │
│ [Send to Kiosk]          │
│ [Set Category ▼]         │
│ [Delete Selected]        │
├─ Categories ─────────────┤
│ [Beach & Pool]   [Photo] │
│ [Evening]    [Activities]│
│ [Restaurant]             │
├─ Retouch ────────────────┤
│ ...                      │
```
