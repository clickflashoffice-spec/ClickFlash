# ClickFlash Integration Guide

> **Complete setup and integration guide for the 6-app ecosystem**

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLICKFLASH ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────┐      ┌──────────────────────────┐             │
│  │  🎛️ MASTER PORTAL        │◄────►│  📱 TOUCH KIOSK          │             │
│  │  apps/master/            │ LAN  │  apps/touch/             │             │
│  │  Port: 8090              │      │  Port: 8091              │             │
│  │                          │      │                          │             │
│  │  Stack: Electron + React │      │  Stack: Electron + React │             │
│  │  DB: SQLite              │      │  DB: SQLite              │             │
│  │  Sync: WebSocket         │      │  Sync: PocketBase        │             │
│  └──────────┬───────────────┘      └──────────┬───────────────┘             │
│             │                                  │                             │
│             └──────────────┬───────────────────┘                             │
│                            │                                                │
│                            ▼                                                │
│                     ┌─────────────┐                                         │
│                     │ Cloud Sync  │                                         │
│                     │(PocketBase) │                                         │
│                     └──────┬──────┘                                         │
│                            │                                                │
│  ┌─────────────────────────┼───────────────────────────────────────────┐   │
│  │                         │              WEB APPS                     │   │
│  │  ┌──────────────────────▼───────────────────────────────────────┐  │   │
│  │  │  💰 Money Trash Uploader (apps/moneytrash/)                │  │   │
│  │  │  Port: 3000                                                │  │   │
│  │  │  Stack: Next.js 16 + React 19                              │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │  📊 Management Hub (apps/management/)                      │  │   │
│  │  │  Port: 8092                                                │  │   │
│  │  │  Stack: React 19 + Vite + Express                          │  │   │
│  │  │  DB: SQLite                                                │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │  🛍️ Customer Gallery (apps/gallery/)                       │  │   │
│  │  │  Port: 8093                                                │  │   │
│  │  │  Stack: React 19 + Vite + Express                          │  │   │
│  │  │  DB: SQLite + Stripe                                       │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │  🌐 Main Website (apps/website/)                           │  │   │
│  │  │  Port: 3001                                                │  │   │
│  │  │  Stack: Next.js 15                                         │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (Development)

### 1. Install All Dependencies

```bash
cd E:\ClickFlash

# Root dependencies
npm install

# Install all app dependencies
npm run install:all
```

### 2. Start the Apps

```bash
# Terminal 1: Master Portal
cd apps/master
npm run dev

# Terminal 2: Touch Kiosk
cd apps/touch
npm run dev

# Terminal 3: Money Trash Uploader
cd apps/moneytrash
npm run dev

# Terminal 4: Management Hub (Frontend)
cd apps/management
npm run dev

# Terminal 5: Management Hub (Backend)
cd apps/management
npm start

# Terminal 6: Customer Gallery (Frontend)
cd apps/gallery
npm run dev

# Terminal 7: Customer Gallery (Backend)
cd apps/gallery
npm start

# Terminal 8: Main Website
cd apps/website
npm run dev
```

## 🔗 App Integration Flow

### Photo Upload Flow

```
1. Photographer uses Money Trash Uploader (Port 3000)
   ↓
2. Uploads photos with metadata (event name, access code, pricing)
   ↓
3. API saves to uploads/ and forwards to Customer Gallery (Port 8093)
   ↓
4. Customer Gallery receives photos via /api/cloud/upload-photo
   ↓
5. Customer receives email notification (via Management Hub Port 8092)
   ↓
6. Customer visits gallery at /gallery/{access-code}
   ↓
7. Customer favorites photos and adds to cart
   ↓
8. Customer checks out with Stripe payment
   ↓
9. Order syncs back to Master Portal (Port 8090) via cloud sync
```

### Order Processing Flow

```
1. Touch Kiosk (Port 8091) - Customer places order
   ↓
2. Order saved to local SQLite database
   ↓
3. Syncs to Master Portal (Port 8090) via WebSocket
   ↓
4. Master Portal syncs to cloud (PocketBase)
   ↓
5. Management Hub (Port 8092) pulls order data
   ↓
6. Photographer processes order in Management Hub
   ↓
7. FulfillmentWorker processes and delivers photos
```

## ⚙️ Configuration

### Environment Variables

Create `.env` files in each app:

#### apps/master/.env
```env
PORT=8090
DATA_DIR=./data
JWT_SECRET=your-master-secret
```

#### apps/touch/.env
```env
PORT=8091
DATA_DIR=./data
MASTER_URL=http://localhost:8090
JWT_SECRET=your-touch-secret
```

#### apps/moneytrash/.env.local
```env
GALLERY_API_URL=http://localhost:8093
MANAGEMENT_API_URL=http://localhost:8092
MAX_FILE_SIZE_MB=50
```

#### apps/management/.env
```env
PORT=8092
DATA_DIR=./pb_data
JWT_SECRET=your-management-secret
STRIPE_SECRET_KEY=sk_test_...
```

#### apps/gallery/.env
```env
PORT=8093
DATA_DIR=./pb_data
JWT_SECRET=your-gallery-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### apps/website/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8092
```

## 🐳 Docker Deployment

### Docker Compose

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  master:
    build: ./apps/master
    ports:
      - "8090:8090"
    volumes:
      - master-data:/app/data
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${MASTER_JWT_SECRET}

  touch:
    build: ./apps/touch
    ports:
      - "8091:8091"
    volumes:
      - touch-data:/app/data
    environment:
      - NODE_ENV=production
      - MASTER_URL=http://master:8090
      - JWT_SECRET=${TOUCH_JWT_SECRET}

  moneytrash:
    build: ./apps/moneytrash
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GALLERY_API_URL=http://gallery:8093
      - MANAGEMENT_API_URL=http://management:8092

  management:
    build: ./apps/management
    ports:
      - "8092:8092"
    volumes:
      - management-data:/app/pb_data
    environment:
      - NODE_ENV=production
      - PORT=8092
      - JWT_SECRET=${MANAGEMENT_JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

  gallery:
    build: ./apps/gallery
    ports:
      - "8093:8093"
    volumes:
      - gallery-data:/app/pb_data
    environment:
      - NODE_ENV=production
      - PORT=8093
      - JWT_SECRET=${GALLERY_JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

  website:
    build: ./apps/website
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production

volumes:
  master-data:
  touch-data:
  management-data:
  gallery-data:
```

### Deploy

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all
docker-compose down
```

## 🔐 Default Credentials

### Management Hub
- **Username:** admin
- **Password:** admin123

### Customer Gallery
- **Access codes** are generated per gallery (e.g., "WED-2026")

### Money Trash Uploader
- No login required for upload interface

## 📊 Monitoring

### Health Check Endpoints

```bash
# Master Portal
curl http://localhost:8090/api/health

# Touch Kiosk
curl http://localhost:8091/api/health

# Money Trash
curl http://localhost:3000/api/health

# Management Hub
curl http://localhost:8092/api/health

# Customer Gallery
curl http://localhost:8093/api/health
```

### Log Locations

```
apps/master/data/logs/
apps/touch/data/logs/
apps/management/pb_data/logs/
apps/gallery/pb_data/logs/
```

## 🧪 Testing

### Run Tests

```bash
# Master Portal E2E tests
cd apps/master
npm test

# Touch Kiosk E2E tests
cd apps/touch
npm test

# API tests
cd apps/gallery
node backend/test_api.js
```

## 📝 API Documentation

### Master Portal API
- Base: `http://localhost:8090`
- Auth: JWT Bearer token
- Docs: See `apps/master/docs/API.md`

### Touch Kiosk API
- Base: `http://localhost:8091`
- Auth: JWT Bearer token
- Sync: WebSocket at `ws://localhost:8091`

### Money Trash API
- Base: `http://localhost:3000`
- Upload: `POST /api/upload`

### Management Hub API
- Base: `http://localhost:8092`
- Auth: JWT Bearer token
- Collections: `/api/{collection}`

### Customer Gallery API
- Base: `http://localhost:8093`
- Auth: JWT Bearer token
- Gallery: `GET /api/albums`

## 🆘 Troubleshooting

### Port Conflicts
```bash
# Check if port is in use
netstat -ano | findstr :8090

# Kill process
taskkill /PID <PID> /F
```

### Database Locked
```bash
# SQLite database locked - restart the app
# Or check for concurrent access
```

### CORS Errors
```bash
# Update CORS_ORIGINS in .env files
# Include your frontend URL
```

### Sync Issues
```bash
# Check WebSocket connection
# Verify MASTER_URL in Touch Kiosk config
# Check firewall settings
```

## 📄 License

Private - ClickFlash Photography Solutions
