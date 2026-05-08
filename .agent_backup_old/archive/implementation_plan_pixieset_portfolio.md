# implementation_plan_pixieset_portfolio.md

**Phase 24 Extension: PixieSet Pro Portfolio Integration**

## 1. Objective

Implement a "PixieSet-style" professional portfolio showcase within the ClickFlash ecosystem. This allows photographers to display their best work to prospective clients via the public-facing Customer Gallery, managed centrally through the Management App.

## 2. Architecture

### A. Database Schema (Management App)

New collection `portfolio_items`:

- `id`: UUID
- `image_url`: String (path to image)
- `title`: String
- `category`: String (e.g., "Weddings", "Portraits", "Events")
- `display_order`: Integer
- `created_at`: Datetime

### B. API Endpoints

- **GET `/api/portfolio`**: Public access. Returns all visible portfolio items.
- **POST `/api/portfolio`**: Admin only. Upload/Create new item.
- **PUT `/api/portfolio/:id`**: Admin only. Update details/order.
- **DELETE `/api/portfolio/:id`**: Admin only. Remove item.

### C. Frontend Components

1. **Management App (Admin)**:
   - `PortfolioManager`: Drag-and-drop grid to manage portfolio images.
   - Upload integration with existing media library.

2. **Customer Gallery (Public)**:
   - `PortfolioPage`: Masonry grid layout with lazy loading.
   - `PortfolioLightbox`: Full-screen immersive view.
   - `CategoryFilter`: Filter grid by category tags.

## 3. Design Aesthetics

- **Style**: Minimalist, high whitespace.
- **Grid**: Dynamic masonry (pinterest-style).
- **Animations**: Fade-in on scroll, smooth lightbox transitions.
- **Performance**: Use compressed 'preview' tier images for grid, full-res for lightbox.

## 4. Implementation Steps

### Step 1: Backend Foundation (30 mins)

- Update Management App backend (`web/management/backend`) to support `portfolio` routes.
- Implement storage logic for portfolio images.

### Step 2: Management UI (45 mins)

- Create `PortfolioLayout.tsx` in Management App.
- Implement upload and sorting interface.

### Step 3: Public Portfolio UI (45 mins)

- Create `Portfolio.tsx` in Customer Gallery.
- Implement Masonry Grid and Lightbox.
- Add navigation link to Portfolio in main header.

## 5. Verification

- Upload 5 high-res photos via Management App.
- Verify they appear in Customer Gallery "Portfolio" page.
- Test category filtering and mobile responsiveness.
