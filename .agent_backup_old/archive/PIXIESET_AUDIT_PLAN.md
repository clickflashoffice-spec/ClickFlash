# Deep Dive Audit Plan: Pixieset Clone (Customer Gallery)

## 1. Executive Summary

* **Objective**: Verify the "Pixieset Clone" web application delivers a "Pro" portfolio experience parity with industry leaders (Pixieset/Pic-Time).
* **Focus**: UI Polish, QR Integration, and Performance.
* **Tech Stack**: Next.js 16 (Turbopack), TailwindCSS, React Server Components.

## 2. Audit Matrix

### A. Design & UX (The "Pro" Feel)

| Feature | Expectation | Current Status (Code Audit) | Action |
| :--- | :--- | :--- | :--- |
| **Hero Cover** | Full-bleed Image, Parallax, Typography | Inspect `Cover.tsx` | **Verify CSS** |
| **Grid Layout** | Adaptive Masonry (Vertical/Horizontal mix) | Inspect `MasonryGrid.tsx` | **Verify Logic** |
| **Typography** | Elegant Serif (Playfair/Bodoni) + Sans | Inspect `layout.tsx` | **Check Fonts** |
| **Animations** | Fade-in on scroll, Hover lifts | Inspect `tailwind.config` | **Check Motion** |

### B. Core Features

| Feature | Requirement | Current Status | Action |
| :--- | :--- | :--- | :--- |
| **Auth** | Password / PIN / **QR Token** (Phase 24) | Inspect `middleware.ts` | **Test QR Flow** |
| **Favorites** | Heart Icon, LocalStorage/API Sync | Inspect `FavoritesContext` | **Verify Sync** |
| **Downloads** | PIN Protected, High-Res/Web-Size | Inspect `DownloadModal` | **Check Security** |
| **Shopping** | Simple Cart / Checkout Redirect | Inspect `CartContext` | **Verify Flow** |

### C. Backend Integration

| Integ Point | Requirement | Current Status | Action |
| :--- | :--- | :--- | :--- |
| **Master API** | Fetch Photos (Lazy Load) | Inspect `api/photos` | **Check Caching** |
| **QR Login** | Validate JWT from Query Param | Inspect `page.tsx` (Root) | **Check Redir** |

## 3. Execution Steps

1. **Code Review**: Analyze `src/app/page.tsx` and `src/components` for "Pro" styling.
2. **QR Flow Check**: Verify `?token=xyz` handling in `middleware` or client component.
3. **Fix Findings**: Polish UI if "Generic" (Bootstrap-ish) instead of "Premium".

## 4. Outcome

Deploy a "Stunning" Client Gallery that justifies the "Pro Portfolio" label in Task Phase 24.
