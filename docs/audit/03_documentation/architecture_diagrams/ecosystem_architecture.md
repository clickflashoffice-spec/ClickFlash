# ClickFlash Ecosystem Architecture Diagram

## Logical Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        MASTER[Master Portal<br/>Electron + React 19<br/>Port: 8090]
        TOUCH[Touch Kiosk<br/>Electron + React 19<br/>Port: 8091]
        MONEYTRASH[MoneyTrash<br/>Next.js 16 + Tauri<br/>Port: 3000]
        WEBSITE[Main Website<br/>Next.js 15<br/>Port: 3001]
    end

    subgraph "Cloud Layer"
        MGMT[Management Hub<br/>React 19 + Vite<br/>Port: 5173]
        GALLERY[Customer Gallery<br/>React 19 + Vite<br/>Port: 5174 + Stripe]
    end

    subgraph "Backend Services"
        MASTER_API[Master API<br/>Express + SQLite]
        TOUCH_API[Touch API<br/>Express + SQLite]
        MGMT_API[Management API<br/>Express]
        GALLERY_API[Gallery API<br/>Express + Stripe]
    end

    subgraph "Data Layer"
        MASTER_DB[(Master SQLite)]
        TOUCH_DB[(Touch SQLite)]
        CLOUD_STORAGE[Cloud Storage<br/>Cloudflare]
    end

    subgraph "External Integrations"
        STRIPE[Stripe Payments]
        CLOUDFLARE[Cloudflare CDN/WAF]
    end

    MASTER <--> MASTER_API
    MASTER_API <--> MASTER_DB
    
    TOUCH <--> TOUCH_API
    TOUCH_API <--> TOUCH_DB
    
    TOUCH -.->|LAN Sync| MASTER_API
    
    MONEYTRASH -->|Upload| CLOUD_STORAGE
    
    MGMT <--> MGMT_API
    GALLERY <--> GALLERY_API
    
    GALLERY_API --> STRIPE
    CLOUD_STORAGE <--> CLOUDFLARE
```

## Master Portal Architecture

```mermaid
graph TB
    subgraph "Electron Main Process"
        MAIN[main.js]
        IPC[IPC Handlers]
    end

    subgraph "React Frontend"
        COMPONENTS[Components]
        HOOKS[Hooks]
        SERVICES[Services]
        TYPES[Types]
    end

    subgraph "Express Backend"
        ROUTES[21 Route Files]
        MIDDLEWARE[Middleware]
        CONTROLLERS[Controllers]
        SERVICES_B[Services]
        SHARED[Shared/DB]
        WORKERS[Workers]
    end

    subgraph "Data"
        SQLITE[(SQLite DB)]
    end

    MAIN --> IPC
    IPC --> ROUTES
    COMPONENTS --> HOOKS
    HOOKS --> SERVICES
    SERVICES --> ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> SERVICES_B
    SERVICES_B --> SHARED
    SHARED --> SQLITE
```

## Touch Kiosk Architecture

```mermaid
graph TB
    subgraph "Electron Main Process"
        MAIN[main.js]
        NETWORK[Network Isolation]
    end

    subgraph "React Frontend"
        COMPONENTS[Components]
        HOOKS[Hooks]
    end

    subgraph "Express Backend"
        ROUTES[9 Route Files]
        HMAC[HMAC Auth]
        SYNC[Sync Service]
    end

    subgraph "Data"
        SQLITE[(Local SQLite)]
    end

    MAIN --> NETWORK
    NETWORK --> ROUTES
    COMPONENTS --> HOOKS
    HOOKS --> ROUTES
    ROUTES --> HMAC
    ROUTES --> SYNC
    SYNC --> SQLITE
    SYNC -.->|HMAC-signed| MASTER[Master Portal]
```

## Data Flow: Order Creation

```mermaid
sequenceDiagram
    participant U as User
    participant M as Master Portal
    participant API as Express API
    participant DB as SQLite
    participant C as Cloud (Sync)

    U->>M: Fills order form
    M->>API: POST /api/orders
    API->>API: Validate input (Zod)
    API->>DB: Insert order record
    DB->>API: Confirm insert
    API->>C: Queue cloud sync
    API->>M: Return order confirmation
    M->>U: Show confirmation
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant M as Master Portal
    participant API as Express API
    participant DB as SQLite

    U->>M: Enter credentials
    M->>API: POST /api/auth/login
    API->>DB: Verify credentials (bcrypt)
    DB->>API: Return user data
    API->>API: Generate JWT + Session
    API->>M: Return token + session cookie
    M->>U: Redirect to dashboard
    
    Note over U,M: Subsequent requests include JWT
```

## Touch-Master Pairing Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant M as Master Portal
    participant T as Touch Kiosk

    A->>M: Initiate pairing
    M->>M: Generate QR code + 32-byte secret
    M->>A: Display QR code
    
    A->>T: Scan QR code
    T->>T: Store signing secret locally
    T->>M: POST /api/pairing/verify
    M->>M: Verify kiosk registration
    M->>T: Confirm pairing
    
    Note over T,M: All future requests signed with HMAC-SHA256
```

## COP Master Clone Architecture

```mermaid
graph TB
    subgraph "Non-Production Environment (COP)"
        COP_MASTER[COP Master Portal]
        COP_API[COP Express API]
        COP_DB[(COP SQLite - Masked)]
        ISOLATION[Network Isolation]
    end

    subgraph "Data Masking Pipeline"
        PROD_DB[(Production SQLite)]
        MASK[Masking Script]
        SYNTHETIC[(Synthetic Data)]
    end

    PROD_DB -->|Copy| MASK
    MASK -->|Mask PII| SYNTHETIC
    SYNTHETIC -->|Load| COP_DB
    
    ISOLATION -.->|No internet| PROD_DB
```

---

*Generated: April 8, 2026*
