# Bundle Size Optimization - Implementation Plan

## Goal

Reduce initial JavaScript bundle size to improve load times on i5 hardware with limited bandwidth. Target: **< 500KB gzipped initial bundle** (currently unknown, need build analysis).

---

## User Review Required

> [!IMPORTANT]
> **Build Analysis Blocked**: PowerShell execution policy prevents running `npm run build`. Manual verification of current bundle size is required before implementing optimizations.

> [!WARNING]
> **Lazy Loading Trade-off**: Route-based code splitting will delay loading of non-critical routes. Users navigating to Settings/Analytics will experience a brief loading state (~200-500ms).

---

## Proposed Changes

### Component 1: Heavy Dependency Analysis

**Findings from package.json** (62 production dependencies):

**Heavy Libraries** (estimated sizes):

- `@tensorflow/tfjs-core` + `@tensorflow/tfjs-backend-cpu`: ~800KB (unused in frontend)
- `framer-motion`: ~100KB (used only in `CloudSettings.tsx`)
- `chart.js` + `react-chartjs-2`: ~150KB (analytics dashboard only)
- `@vladmandic/face-api`: ~500KB (AI features, backend-only)
- `react-virtuoso`: ~50KB (album grids, frequently used)
- `lucide-react`: ~200KB (icons everywhere, keep in main bundle)

**Optimization Strategy**:

1. Move TensorFlow/face-api to backend-only (already externalized in esbuild config)
2. Lazy load `framer-motion` (only in CloudSettings)
3. Lazy load `chart.js` (only in Analytics routes)

---

### Component 2: Route-Based Code Splitting

**Files**:

- [MODIFY] [`src/App.tsx`](file:///e:/ClickFlash/master-app/react-new/src/App.tsx)
- [NEW] [`src/pages/`](file:///e:/ClickFlash/master-app/react-new/src/pages/) (route components)

**Implementation**:

Convert current inline route components to lazy-loaded modules:

```tsx
// App.tsx - BEFORE
<Route path="/settings" element={<Settings />} />

// App.tsx - AFTER
const Settings = lazy(() => import('./pages/Settings'));
<Route path="/settings" element={
  <Suspense fallback={<LoadingSpinner />}>
    <Settings />
  </Suspense>
} />
```

**Routes to Lazy Load** (non-critical):

- `/settings/*` - Settings pages (framer-motion dependency)
- `/analytics` - Analytics dashboard (chart.js dependency)
- `/devices` - Device management
- `/logs` - System logs viewer
- `/backup` - Backup/restore

**Routes to Keep Eager** (critical path):

- `/` - Dashboard (initial load)
- `/albums` - Album grid (primary workflow)
- `/albums/:id` - Album detail (primary workflow)
- `/import` - Photo import (primary workflow)

---

### Component 3: Dynamic Import for Heavy Components

**Files**:

- [MODIFY] [`src/components/settings/CloudSettings.tsx`](file:///e:/ClickFlash/master-app/react-new/src/components/settings/CloudSettings.tsx)
- [NEW] [`src/components/analytics/LazyChart.tsx`](file:///e:/ClickFlash/master-app/react-new/src/components/analytics/LazyChart.tsx)

**CloudSettings - Lazy Motion**:

```tsx
// Before
import { motion } from 'framer-motion';

// After
const MotionDiv = lazy(() => import('framer-motion').then(mod => ({ 
  default: mod.motion.div 
})));

// In component
<Suspense fallback={<div>...</div>}>
  <MotionDiv animate={{ opacity: 1 }}>...</MotionDiv>
</Suspense>
```

**Analytics - Lazy Chart.js**:

```tsx
// Create wrapper component that lazy loads chart.js
const LazyChart = lazy(() => import('./LazyChartImpl'));
```

---

### Component 4: Vite Build Optimization

**Files**:

- [MODIFY] [`vite.config.ts`](file:///e:/ClickFlash/master-app/react-new/vite.config.ts) (if exists)
- [CREATE] [`vite.config.ts`](file:///e:/ClickFlash/master-app/react-new/vite.config.ts) (if missing)

**Configuration**:

```ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', '@emotion/react'],
          'vendor-heavy': ['framer-motion', 'chart.js'],
        }
      }
    },
    chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Pre-bundle frequently used
  }
});
```

---

## Verification Plan

### Automated Tests

**Build Analysis** (manual, requires PowerShell fix):

```powershell
npm run build
# Check dist/ folder sizes
Get-ChildItem dist/assets/*.js | Measure-Object -Property Length -Sum
```

**Bundle Analyzer** (optional):

```bash
npm install --save-dev rollup-plugin-visualizer
# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
plugins: [visualizer()]
```

### Manual Verification

1. **Initial Load Time**:
   - Open DevTools → Network
   - Hard refresh (`Ctrl+Shift+R`)
   - Measure: Time to interactive (TTI)
   - Target: **< 2 seconds** on i5 hardware

2. **Lazy Route Loading**:
   - Navigate to `/settings`
   - Verify: Loading spinner appears briefly
   - Verify: Settings loads within 500ms

3. **Bundle Size Comparison**:
   - Before optimization: Record `dist/assets/*.js` total size
   - After optimization: Verify **> 30% reduction**

---

## Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Bundle | ~800KB (est.) | < 500KB | 37.5% |
| Settings Route | Eager loaded | Lazy (~100KB) | Deferred |
| Analytics Route | Eager loaded | Lazy (~150KB) | Deferred |
| Time to Interactive | ~3-4s (est.) | < 2s | 50% |

---

## Dependencies

**No new dependencies required**. Uses built-in React `lazy()` and `Suspense`.

**Optional** (for analysis):

- `rollup-plugin-visualizer` (dev dependency)

---

## Timeline

- **Route Lazy Loading**: 2 hours
- **Component Dynamic Imports**: 1.5 hours
- **Vite Config Optimization**: 1 hour
- **Verification**: 1 hour

**Total**: ~5.5 hours

---

**Verify**: Ready to implement bundle size optimizations?
