# ClickFlash Data Flow Diagrams

## Master Portal Data Flows

### Photo Upload Flow

```mermaid
flowchart TD
    subgraph "User Action"
        U[User selects photos]
        V[Validation check]
    end

    subgraph "Frontend"
        F[React Component]
        S[API Service]
    end

    subgraph "Backend"
        R[Route Handler]
        C[Controller]
        P[Photo Processor]
    end

    subgraph "Storage"
        FS[File System]
        DB[(SQLite Database)]
    end

    U --> F
    F --> V
    V --> S
    S -->|HTTP POST| R
    R --> C
    C --> P
    P -->|Save file| FS
    P -->|Insert metadata| DB
    P -->|Thumbnail generation| FS
    P -->|Notify| R
    R -->|Response| S
    S -->|Update UI| F
```

### Order Management Flow

```mermaid
flowchart TD
    subgraph "Client"
        OF[Order Form]
        OC[Order Create API]
    end

    subgraph "Server"
        VR[Validation]
        OR[Order Routes]
        OCt[Order Controller]
        OQ[Order Queries]
    end

    subgraph "Database"
        ODB[(orders table)]
        PDB[(products table)]
        CDB[(customers table)]
    end

    subgraph "External"
        STR[Stripe Checkout]
        CLD[Cloud Sync]
    end

    OF --> OC
    OC --> VR
    VR --> OR
    OR --> OCt
    OCt --> OQ
    OQ --> ODB
    OQ --> PDB
    OQ --> CDB
    OCt --> STR
    OCt --> CLD
    STR -->|Payment| OCt
    CLD -->|Sync| OCt
    OCt -->|Response| OC
    OC -->|Update UI| OF
```

### Cloud Sync Flow

```mermaid
flowchart TD
    subgraph "Local (Master)"
        LOCAL[Local Data]
        QUEUE[Sync Queue]
        SYNC[Sync Service]
    end

    subgraph "Transport"
        API[REST API]
    end

    subgraph "Cloud"
        CF[Cloudflare]
        REMOTE[Remote Storage]
    end

    LOCAL --> QUEUE
    QUEUE --> SYNC
    SYNC --> API
    API --> CF
    CF --> REMOTE
    
    REMOTE -.->|Check changes| CF
    CF -.->|Pull changes| API
    API -.->|Update local| SYNC
    SYNC -.->|Apply changes| LOCAL
```

## Touch Kiosk Data Flows

### Touch-Master Sync Flow

```mermaid
flowchart TD
    subgraph "Touch Kiosk"
        LOCAL[Local Data]
        SIGN[HMAC Signer]
        EXP[Export Controller]
    end

    subgraph "Transport"
        HTTP[HTTP + Headers]
    end

    subgraph "Master Portal"
        VERIFY[HMAC Verifier]
        IMPORT[Import Controller]
        DB[(SQLite)]
    end

    LOCAL --> SIGN
    SIGN -->|X-Kiosk-ID| EXP
    SIGN -->|X-Timestamp| EXP
    SIGN -->|X-Signature| EXP
    EXP --> HTTP
    HTTP --> VERIFY
    VERIFY --> IMPORT
    IMPORT --> DB
    
    DB -->|Confirm| IMPORT
    IMPORT -->|Response| VERIFY
    VERIFY -->|Sync status| HTTP
    HTTP -->|Response| EXP
```

### Order Creation on Touch

```mermaid
flowchart TD
    subgraph "Touch Kiosk"
        UI[Touch UI]
        FORM[Order Form]
        SIGN[Request Signer]
        API[Touch API]
    end

    subgraph "Master Portal"
        VERIFY[Signature Verify]
        CREATE[Order Create]
        DB[(SQLite)]
    end

    UI --> FORM
    FORM --> SIGN
    SIGN --> API
    API -->|POST + HMAC| VERIFY
    VERIFY --> CREATE
    CREATE --> DB
    DB -->|Order ID| CREATE
    Create -->|Response| VERIFY
    VERIFY -->|Success| API
    API -->|Update UI| UI
```

## Management Hub Data Flows

### Authentication Flow

```mermaid
flowchart TD
    subgraph "Client"
        LOGIN[Login Form]
        FE[Frontend API]
    end

    subgraph "Backend"
        AUTH[Auth Handler]
        JWT[JWT Generator]
        DB[(User DB)]
    end

    subgraph "External"
        FINGERPRINT[Hardware Fingerprint]
    end

    LOGIN --> FE
    FE --> AUTH
    AUTH --> FINGERPRINT
    FINGERPRINT -->|Fingerprint| AUTH
    AUTH --> DB
    DB -->|User Data| AUTH
    AUTH --> JWT
    JWT -->|RS256 JWT| FE
    FE -->|Set Token| LOGIN
```

## Customer Gallery Data Flows

### Payment Flow

```mermaid
flowchart TD
    subgraph "Gallery Client"
        CART[Shopping Cart]
        CHECK[Checkout]
    end

    subgraph "Gallery Backend"
        SESSION[Session Validate]
        CHECKOUT[Checkout Controller]
        STRIPE[Stripe Client]
    end

    subgraph "Stripe"
        CHECKOUT_API[Stripe Checkout]
        WEBHOOK[Webhook Handler]
    end

    CART --> CHECK
    CHECK --> SESSION
    SESSION --> CHECKOUT
    CHECKOUT --> STRIPE
    STRIPE --> CHECKOUT_API
    CHECKOUT_API -->|Payment Link| CHECKOUT
    CHECKOUT -->|Redirect| CART
    
    CHECKOUT_API -->|Webhook| WEBHOOK
    WEBHOOK -->|Confirm| CHECKOUT
```

---

*Generated: April 8, 2026*
