# ClickFlash Ecosystem - Skills-Based Improvement Plan

> Analysis and improvement roadmap based on applied skills from `.agent/skills`

---

## 📋 Skills Applied

| Skill | Purpose | Status |
|-------|---------|--------|
| clean-code | Code quality standards | ✅ Applied |
| react-best-practices | Frontend optimization | ✅ Applied |
| backend-dev-guidelines | API architecture | ✅ Applied |
| database-design | SQLite optimization | ✅ Applied |
| testing-patterns | Test strategy | ✅ Applied |
| api-security-best-practices | Security hardening | ✅ Applied |

---

## 🔍 Current State Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLICKFLASH ECOSYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│  ELECTRON APPS          │  WEB APPS                        │
│  ├─ Master Portal       │  ├─ Money Trash (Next.js)        │
│  └─ Touch Kiosk         │  ├─ Management Hub (React+Vite)  │
│                         │  ├─ Customer Gallery (React)     │
│                         │  └─ Main Website (Next.js)       │
├─────────────────────────────────────────────────────────────┤
│  SHARED INFRASTRUCTURE                                      │
│  ├─ SQLite (better-sqlite3) with WAL mode                   │
│  ├─ WebSocket real-time sync                                │
│  ├─ PocketBase cloud sync                                   │
│  └─ no zip                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Priority Improvements (Using Skills)

### 1. CLEAN CODE REFACTORING (Priority: CRITICAL)

**Issues Found:**

- Some components exceed 300+ lines
- Mixed abstraction levels in functions
- Duplicate code across apps

**Action Items:**

```typescript
// BEFORE (Violates clean-code)
const MoneyTrash = () => {
  // 300+ lines mixed concerns
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  // ... 50 more lines of state
  // ... fetch logic mixed with UI
  // ... 200 lines of JSX
};

// AFTER (Clean code principles)
// hooks/useMoneyTrash.ts - Single responsibility
// components/MoneyTrashStats.tsx - Presentation
// components/MoneyTrashConfig.tsx - Configuration
// components/MoneyTrashCandidates.tsx - Candidate management
```

---

### 2. REACT BEST PRACTICES (Priority: HIGH)

**Vercel Rules Applied:**

#### 2.1 Eliminate Waterfalls (CRITICAL)

```typescript
// BEFORE - Waterfall
const albums = await fetchAlbums();
for (const album of albums) {
  const photos = await fetchPhotos(album.id); // Serial - BAD
}

// AFTER - Parallel (Promise.all)
const [albums, photos] = await Promise.all([
  fetchAlbums(),
  fetchAllPhotos() // Bulk endpoint
]);
```

#### 2.2 Bundle Size Optimization

```typescript
// Dynamic imports for heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
```

---

### 3. BACKEND ARCHITECTURE (Priority: HIGH)

**Layered Architecture:**

```
HTTP Request
    ↓
Routes → Controllers → Services → Repositories → Database
```

**Refactor backend from:**

```typescript
// All-in-one route handler
app.get('/api/albums/:id', async (req, res) => {
  // Database query
  // Business logic
  // Response formatting
});
```

**To:**

```typescript
// routes/albumRoutes.ts
router.get('/:id', albumController.getById);

// controllers/AlbumController.ts
class AlbumController {
  async getById(req, res) {
    const album = await albumService.getWithPhotos(req.params.id);
    this.sendSuccess(res, album);
  }
}

// services/AlbumService.ts
class AlbumService {
  async getWithPhotos(albumId) {
    return albumRepository.findWithPhotos(albumId);
  }
}
```

---

### 4. DATABASE OPTIMIZATION (Priority: MEDIUM-HIGH)

**Missing Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(albumId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_retention_queue_status ON retention_queue(status);
```

---

### 5. TESTING STRATEGY (Priority: MEDIUM)

**Factory Pattern:**

```typescript
const getMockAlbum = (overrides?: Partial<Album>): Album => ({
  id: 'album-123',
  title: 'Test Album',
  status: 'Finalized',
  ...overrides
});
```

---

### 6. API SECURITY (Priority: HIGH)

```typescript
// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Input Validation (Zod)
const albumSchema = z.object({
  title: z.string().min(1).max(200),
  customerEmail: z.string().email().optional()
});

// Secure Headers
app.use(helmet());
```

---

## 📊 Implementation Roadmap

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Testing setup, DB indexes, Security | Week 1 |
| 2 | Backend architecture refactor | Week 2-3 |
| 3 | Frontend optimization | Week 3-4 |
| 4 | Testing coverage | Week 4-5 |
| 5 | Security audit | Week 5 |

---

## 📈 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage | ~20% | 80%+ |
| Bundle Size | ~2MB | <1.5MB |
| API Response | ~200ms | <100ms |
| Lighthouse Score | ~70 | 90+ |

---

*Generated using ClickFlash Skills Framework*
*Date: 2026-01-31*
