# Customer Gallery

> **Customer-facing photo gallery for browsing, favoriting, and purchasing photos**

## ✨ Features

### 🖼️ Photo Browsing
- **Gallery View** - Grid layout of all photos
- **Lightbox** - Full-screen photo viewer
- **Zoom & Pan** - Detailed photo inspection
- **Keyboard Navigation** - Arrow keys, ESC to close
- **Mobile Responsive** - Optimized for all devices

### ❤️ Favorites System
- **Heart/Favorite** - Mark photos for later
- **Favorites Page** - View all favorited photos
- **Bulk Actions** - Select multiple photos
- **Persistent Storage** - Saved to user account

### 🛒 Shopping & Checkout
- **Add to Cart** - Select photos for purchase
- **Product Selection** - Choose print sizes, digital
- **Cart Management** - Review and modify orders
- **Stripe Payments** - Secure payment processing
- **Order Status** - Track order progress

### 💳 Pricing & Products
- **Single Photo Pricing** - Per-photo purchase
- **Full Gallery Pricing** - Complete gallery access
- **Product Catalog** - Prints, downloads, packages
- **Dynamic Pricing** - Set per-gallery prices

### 📱 Customer Experience
- **Password Protection** - Secure gallery access
- **Email Notifications** - "Ready to view" emails
- **Download Photos** - Digital delivery
- **Share Gallery** - Social sharing options
- **Responsive Design** - Mobile-optimized

## 🏗️ Architecture

### Backend (`backend/`)
```
backend/
├── server.js              # Main Express server (110KB)
├── db.js                  # Database manager
├── auth.js                # Authentication
├── validation.js          # Request validation
├── errorHandler.js        # Error handling
├── auditLogger.js         # Security auditing
├── logger.js              # Application logging
├── rateLimiter.js         # Rate limiting
├── photoProcessor.js      # Image processing
├── workers/
│   └── fulfillmentWorker.js  # Order processing
├── routes/
│   ├── downloads.js       # File downloads
│   └── syncRoutes.js      # Cloud sync
└── migrations/            # Database migrations
```

**Features:**
- JWT authentication
- SQLite database (better-sqlite3)
- Photo upload handling
- Order processing
- Stripe integration
- Email notifications
- Audit logging

### Frontend (`src/`)
```
src/
├── App.tsx                # Main app component
├── components/
│   ├── customer/          # Customer-facing UI
│   │   ├── CustomerGallery.tsx
│   │   ├── CustomerLayout.tsx
│   │   ├── CustomerLogin.tsx
│   │   ├── Lightbox.tsx
│   │   ├── FavoritesPage.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── CheckoutModal.tsx
│   │   ├── AddToCartModal.tsx
│   │   ├── PaymentForm.tsx
│   │   ├── OrderStatusPage.tsx
│   │   ├── StorePage.tsx
│   │   └── ...
│   ├── albums/            # Album management
│   ├── dashboard/         # Admin dashboard
│   ├── management/        # Management tools
│   ├── orders/            # Order management
│   └── common/            # Shared components
├── hooks/                 # Custom hooks
├── services/              # API services
│   ├── apiService.ts
│   ├── stripeService.ts
│   └── syncService.ts
└── utils/                 # Utilities
```

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start frontend (Vite)
npm run dev

# Start backend (separate terminal)
npm start
```

### Production

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 🔧 Configuration

Create `.env` file:

```env
# Server
PORT=8093
DATA_DIR=./pb_data
JWT_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Gallery URL
GALLERY_URL=http://localhost:5173
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Customer login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current customer

### Gallery
- `GET /api/albums` - List albums
- `GET /api/albums/:id` - Get album details
- `GET /api/photos` - List photos
- `GET /api/photos/:id` - Get photo details

### Favorites
- `GET /api/favorites` - Get favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/:id` - Remove favorite

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id` - Update order

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment

### Cloud Sync
- `POST /api/cloud/sync-album` - Receive album sync
- `POST /api/cloud/upload-photo` - Receive photo upload
- `GET /api/cloud/status` - Sync status

## 🎨 Gallery Access

Customers access galleries via:

```
http://localhost:5173/gallery/{access-code}
```

Or with auto-login:
```
http://localhost:5173/gallery/{access-code}?autoLogin=true
```

## 💳 Stripe Integration

### Setup
1. Create Stripe account
2. Get API keys from Stripe Dashboard
3. Add keys to `.env`
4. Configure webhook endpoint

### Webhook Events
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `checkout.session.completed` - Checkout complete

## 🐳 Docker

```bash
# Build image
docker build -t clickflash-gallery .

# Run container
docker run -p 8093:8093 \
  -v pb_data:/app/pb_data \
  -e STRIPE_SECRET_KEY=sk_test_... \
  clickflash-gallery
```

## 🔗 Integration

Connects to:
- **Master Portal** - Receive orders, albums
- **Money Trash Uploader** - Receive photo uploads
- **Management Hub** - Business analytics
- **Stripe** - Payment processing

## 📝 Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT tokens
- **Payments:** Stripe
- **Charts:** Chart.js

## 📄 License

Private - ClickFlash Photography Solutions
