# Comprehensive 100% Project Audit Plan (Star Master OS)

## Objective

To perform a granular, line-by-line audit of the entire ClickFlash project directory to ensure 100% compliance with Operational Laws and identify all architectural gaps.

## 1. Audit Scope (5-Layer Scan)

| Layer | Root Directory | Primary Languages | Focus |
|-------|----------------|-------------------|-------|
| **Master App** | `e:\ClickFlash\master-app` | TSX, Python, C++, Node.js | Processing Pipeline, Local Server, Face Recog |
| **Touch App** | `e:\ClickFlash\touch-app` | React, C++, Python | Kiosk Mode, Local Ordering, Sync Bus |
| **Management** | `e:\ClickFlash\web\management` | Next.js, PocketBase | Fleet Control, Payroll, Revenue Tracking |
| **Gallery** | `e:\ClickFlash\web\customer-gallery` | Next.js, Supabase | Public Storefront, Delivery Engine |
| **PixieSet** | `e:\ClickFlash\web\pixieset-clone` | Next.js, Supabase | CRM, Project Management, Portfolio Builder |

## 2. Audit Phases & Methodology

### Phase A: Structural Integrity (Filesystem)

1. **Recursion**: Crawl every subdirectory in the root.
2. **Ghost File Detection**: Identify `.js` or `.bak` files that should be deleted/ignored.
3. **Law 11 Verification**: Ensure no development artifacts exist outside the `.agent` folder.

### Phase B: Logic & Codeflow (Line-by-Line)

1. **Entrypoints**: Trace `main.tsx`, `electron-main.js`, and `server.ts` for every app.
2. **Data Model Matching**: Compare `types.ts` across all 5 apps to ensure shared objects (Order, Photo, User) are identical.
3. **Mechanism Audit**:
   - **Sync**: Line-by-line review of `PocketBaseSyncService` and `KioskSync`.
   - **FaceRecog**: Review embeddings generation in Python vs Search logic in React.
   - **Printing**: Audit the shell execution of `pdf-to-printer` and native C++ print calls.

### Phase C: Infrastructure & Security

1. **Port Conflicts**: Map every hardcoded port (`8090`, `8091`, `8092`, `5173`) to prevent collisions.
2. **Auth Flow**: Review JWT signing and token storage in `localStorage`.
3. **Error Handling**: Audit `try/catch` blocks in critical workers to ensure no silent failures.

## 3. Deliverables

- **The Master File Map**: A JSON/Markdown file mapping 100% of the project files to their owners and roles.
- **Technical Debt Ledger**: List of every line of code that requires refactoring.
- **Unified Schema Registry**: The definitive data model for the entire ecosystem.

## 4. Execution Schedule

1. **Module 1**: Master App React-New (Deep Scan)
2. **Module 2**: Master App Python/CPP (Deep Scan)
3. **Module 3**: Touch App Suite (Deep Scan)
4. **Module 4**: Web Portals & Cloud Bridge (Deep Scan)
