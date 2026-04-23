# Cloud Architecture Guide

## ClickFlash Cloud Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLICKFLASH CLOUD INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     │
│  │   Management    │     │     Gallery      │     │     Website     │     │
│  │      Hub        │     │                  │     │                  │     │
│  │  Cloudflare     │     │   Cloudflare      │     │   Cloudflare    │     │
│  │   Pages         │     │    Pages          │     │    Pages        │     │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘     │
│           │                       │                       │               │
│           └───────────────────────┼───────────────────────┘               │
│                                   │                                           │
│                    ┌──────────────┴──────────────┐                          │
│                    │        Cloudflare CDN        │                          │
│                    │    (Global Edge Network)      │                          │
│                    └──────────────┬───────────────┘                          │
│                                   │                                           │
│           ┌───────────────────────┼───────────────────────┐                 │
│           │                       │                       │                  │
│  ┌────────┴────────┐     ┌───────┴────────┐     ┌───────┴────────┐         │
│  │   Cloudflare     │     │  Cloudflare     │     │    PocketBase  │         │
│  │   Workers        │     │  R2 Storage    │     │   (Analytics)  │         │
│  │  (API + Edge)    │     │  (Images)      │     │                 │         │
│  └────────┬────────┘     └────────────────┘     └────────────────┘         │
│           │                                                                 │
│  ┌────────┴────────────────────────────────────────────┐                    │
│  │              Cloudflare D1 Database                  │                    │
│  │           (Regional - Management + Gallery)            │                    │
│  └───────────────────────────────────────────────────────┘                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Service Architecture

#### Management Hub (React + Vite + Express)

```
┌─────────────────────────────────────────────────────────────┐
│                    MANAGEMENT HUB                             │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19)                                        │
│  ├── Vite Dev Server (5173)                                │
│  ├── React Query (Server State)                            │
│  ├── React Router (Navigation)                              │
│  └── Tailwind CSS (Styling)                                 │
├─────────────────────────────────────────────────────────────┤
│  Backend (Express)                                           │
│  ├── /api/photographers - User Management                  │
│  ├── /api/albums - Album Management                         │
│  ├── /api/orders - Order Processing                         │
│  ├── /api/fleet - Kiosk Fleet Management                  │
│  ├── /api/analytics - Business Analytics                   │
│  └── /api/config - Remote Configuration                   │
├─────────────────────────────────────────────────────────────┤
│  Integrations                                               │
│  ├── Supabase (Settings Sync)                               │
│  ├── PocketBase (Analytics)                                 │
│  └── Cloudflare Workers (Realtime)                         │
└─────────────────────────────────────────────────────────────┘
```

#### Gallery (React + Vite + Stripe)

```
┌─────────────────────────────────────────────────────────────┐
│                      CUSTOMER GALLERY                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19)                                        │
│  ├── Vite Dev Server (5174)                                │
│  ├── React Query (Server State)                            │
│  ├── Stripe Elements (Payments)                              │
│  └── Framer Motion (Animations)                            │
├─────────────────────────────────────────────────────────────┤
│  Backend (Express)                                           │
│  ├── /api/albums - Album Access                            │
│  ├── /api/photos - Photo Retrieval                         │
│  ├── /api/orders - Order Processing                        │
│  ├── /api/payments - Stripe Checkout                        │
│  └── /api/share - Social Sharing                           │
├─────────────────────────────────────────────────────────────┤
│  Storage                                                     │
│  ├── Cloudflare R2 (Photo Storage)                         │
│  ├── R2 Signed URLs (Secure Access)                        │
│  └── CDN Caching (Global Distribution)                      │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (Cloudflare D1)

```sql
-- Management Hub Database

CREATE TABLE photographers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    photographer_id TEXT REFERENCES photographers(id),
    access_code TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    album_id TEXT REFERENCES albums(id),
    customer_email TEXT NOT NULL,
    status TEXT NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fleet_stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_albums_photographer ON albums(photographer_id);
CREATE INDEX idx_orders_album ON orders(album_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_fleet_status ON fleet_stations(status);
```

### API Design

#### RESTful Endpoints

```
# Albums
GET    /api/albums                    - List albums
GET    /api/albums/:id               - Get album details
POST   /api/albums                   - Create album
PATCH  /api/albums/:id               - Update album
DELETE /api/albums/:id               - Delete album

# Photos
GET    /api/albums/:id/photos        - List photos in album
GET    /api/photos/:id               - Get photo details
POST   /api/photos/:id/select       - Select photo for order

# Orders
GET    /api/orders                   - List orders
GET    /api/orders/:id               - Get order details
POST   /api/orders                   - Create order
PATCH  /api/orders/:id/status        - Update order status

# Fleet
GET    /api/fleet/status              - Get fleet status
GET    /api/fleet/stations           - List stations
POST   /api/fleet/stations/:id/sync  - Force sync station
```

#### Response Format

```typescript
interface ApiResponse<T> {
    data: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        timestamp: string;
    };
    error?: {
        code: string;
        message: string;
    };
}
```

### Security Architecture

#### Authentication Flow

```
1. User Login
   └── POST /api/auth/login
       └── Validate credentials
           └── Generate JWT (RS256)
               └── Return token + refresh token

2. API Requests
   └── Authorization: Bearer <jwt>
       └── Verify signature (RS256)
           └── Check expiration
               └── Validate permissions
                   └── Process request

3. Refresh Token
   └── POST /api/auth/refresh
       └── Validate refresh token
           └── Generate new JWT
               └── Return new tokens
```

#### Cloudflare Workers Security

```typescript
// Worker authentication middleware
export async function authenticate(request: Request): Promise<AuthResult> {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return { authorized: false, error: 'Missing token' };
    }
    
    try {
        const payload = await verifyJWT(token);
        return { authorized: true, user: payload };
    } catch {
        return { authorized: false, error: 'Invalid token' };
    }
}
```

### Scaling Strategy

#### Horizontal Scaling (Cloudflare)

- Automatic scaling via Cloudflare Pages
- Edge workers run closer to users
- R2 storage scales automatically
- D1 database scales with read replicas

#### Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTIMIZATION LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│  1. CDN Edge Caching                                        │
│     └── Static assets cached globally                        │
│     └── Images served from edge locations                    │
├─────────────────────────────────────────────────────────────┤
│  2. Browser Caching                                         │
│     └── Service Worker caches assets                         │
│     └── IndexedDB for offline support                        │
├─────────────────────────────────────────────────────────────┤
│  3. API Response Caching                                     │
│     └── React Query stale-while-revalidate                   │
│     └── CDN cache for public endpoints                       │
├─────────────────────────────────────────────────────────────┤
│  4. Database Optimization                                   │
│     └── D1 read replicas for reads                           │
│     └── Indexed queries                                     │
└─────────────────────────────────────────────────────────────┘
```

### Monitoring & Observability

#### Metrics Collection

```typescript
// Custom metrics via Cloudflare Analytics
interface Metrics {
    requests: {
        total: number;
        cached: number;
        errors: number;
    };
    latency: {
        p50: number;
        p95: number;
        p99: number;
    };
    cpu: {
        average: number;
        peak: number;
    };
}
```

#### Logging Strategy

```typescript
// Structured logging for Cloudflare Workers
export function logRequest(request: Request, context: ExecutionContext) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: request.method,
        path: new URL(request.url).pathname,
        cfRay: request.headers.get('cf-ray'),
        userAgent: request.headers.get('user-agent'),
    };
    
    console.log(JSON.stringify(logEntry));
}
```

### Disaster Recovery

#### Backup Strategy

| Data Type | Backup Frequency | Retention | Storage |
|-----------|-----------------|-----------|---------|
| D1 Database | Hourly | 30 days | Cloudflare R2 |
| R2 Photos | Daily incremental | 90 days | Cloudflare R2 |
| Configuration | On change | 1 year | Git |

#### Recovery Procedures

```bash
# Restore D1 database
wrangler d1 execute production --file=./backups/latest.sql

# Restore R2 from backup
aws s3 sync s3://backup-bucket/ /r2/production/

# Verify integrity
wrangler d1 execute production --command="SELECT COUNT(*) FROM albums"
```

## Deployment Architecture

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS                           │
├─────────────────────────────────────────────────────────────┤
│  1. Push/PR to main                                        │
│     └── Run tests (Jest + Playwright)                      │
│     └── Type checking (TypeScript)                         │
│     └── Linting (ESLint)                                   │
├─────────────────────────────────────────────────────────────┤
│  2. Merge to main                                         │
│     └── Build application                                  │
│     └── Deploy to staging                                  │
│     └── Run E2E tests                                     │
├─────────────────────────────────────────────────────────────┤
│  3. Tag release (v*)                                       │
│     └── Deploy to production                               │
│     └── Upload artifacts                                   │
│     └── Notify Slack                                       │
└─────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```yaml
# Staging Environment
VITE_API_URL: https://api-staging.clickflash.com
VITE_STRIPE_KEY: pk_test_...
CLOUDFLARE_ACCOUNT: staging-account

# Production Environment
VITE_API_URL: https://api.clickflash.com
VITE_STRIPE_KEY: pk_live_...
CLOUDFLARE_ACCOUNT: production-account
```
