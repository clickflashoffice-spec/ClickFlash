# Current Architecture

This is a source-derived architecture, not an assertion that every depicted deployment is live. Solid arrows have repository evidence; dashed arrows are intended or plausible relationships whose deployed configuration/runtime behavior was not proven.

## Ecosystem context

```mermaid
flowchart LR
  Customer["Customer / guest"] --> Website["Website"]
  Customer --> Gallery["Customer Gallery"]
  Customer --> Touch["Touch kiosk"]
  Customer -.-> MobileCustomer["Mobile Customer"]
  Photographer["Photographer / staff"] --> Master["Master desktop"]
  Photographer --> Management["Management portal"]
  Photographer -.-> MobileStaff["Photographer / Staff mobile"]
  Operator["Installer / license operator"] --> Installer["Installer"]
  Operator --> License["License Generator"]
  Ride["Ride camera node"] -.-> Cloud["Cloud backends"]

  Website -.-> Cloud
  Gallery --> GalleryWorker["Gallery Worker"]
  Management --> ManagementWorker["Management Worker"]
  Touch --> CloudBackend["Cloud Backend Worker"]
  Master --> CloudBackend
  MoneyTrash["MoneyTrash desktop"] --> MoneyWorker["MoneyTrash Worker"]
  MobileCustomer -.-> Cloud
  MobileStaff -.-> Cloud

  CloudBackend --> D1["D1"]
  GalleryWorker --> D1
  ManagementWorker --> D1
  MoneyWorker --> D1
  CloudBackend --> R2["R2 photo/object storage"]
  GalleryWorker --> R2
  MoneyWorker --> R2
```

## Backend authority problem

```mermaid
flowchart TB
  Clients["Desktop, web, kiosk, and mobile clients"]
  A["apps/cloud-backend"]
  B["workers/gallery-worker"]
  C["workers/management-worker"]
  D["workers/moneytrash-worker"]
  U["workers/update-server"]
  DB["D1 / R2 / KV"]
  M1["Cloud migrations"]
  M2["Worker-local migrations"]
  M3["Master / Touch / C++ migrations"]
  M4["packages/database migrations"]

  Clients --> A
  Clients --> B
  Clients --> C
  Clients --> D
  Clients -.-> U
  A --> DB
  B --> DB
  C --> DB
  D --> DB
  M1 --> DB
  M2 --> DB
  M3 -.-> DB
  M4 -.-> DB
```

There is no single discoverable contract, authorization policy, schema owner, or migration authority spanning these services. That amplifies both the route-level authorization defects and schema drift risk.

## Desktop trust boundary

```mermaid
sequenceDiagram
  participant U as User
  participant R as Sandboxed renderer
  participant P as Preload / typed bridge
  participant M as Electron main or Tauri command
  participant OS as Filesystem / device / process
  participant API as Cloud API
  U->>R: Select, configure, upload, install
  R->>P: Named privileged operation
  P->>M: IPC invocation
  M->>OS: Native action
  M->>API: Authenticated request
  API-->>M: Result / acknowledgement
  M-->>P: Sanitized result
  P-->>R: UI state
```

The repository generally configures Electron renderers with `nodeIntegration: false`, `contextIsolation: true`, and sandboxing, which is a meaningful positive control. Assurance remains incomplete until every privileged IPC handler validates sender, input, authorization, cancellation, and error redaction. MoneyTrash currently violates the intended flow at the UI/service seam; Ride Node violates the acknowledgement-before-delete property.

## Build and deployment topology

```mermaid
flowchart LR
  Commit["Commit / pull request"] --> CI["CI workflows"]
  CI --> Quality["lint / typecheck / test / audit"]
  Tag["Tag"] --> Release["release.yml"]
  Main["main"] --> Deploy["deploy.yml / cd.yml"]
  Release --> Desktop["Desktop artifacts"]
  Release --> Mobile["Mobile artifacts"]
  Deploy --> Workers["Cloudflare Workers"]
  Deploy --> Pages["Pages sites"]
  Desktop --> Sign["Code signing / provenance"]

  CI -. "invalid duplicate YAML and non-blocking gates" .-> Quality
  Release -. "wrong filters / compile-only jobs" .-> Desktop
  Release -. "missing mobile release configuration" .-> Mobile
  Desktop -. "local samples NotSigned" .-> Sign
```

## Architectural characteristics

- **Strengths:** clear product separation; typed React/TypeScript majority; hardened Electron renderer defaults; dedicated Workers; multiple focused packages; broad Master test inventory.
- **Critical weaknesses:** authorization is not centralized or consistently applied; schema and migration ownership are fragmented; release truth differs from workflow labels; several experimental surfaces appear production-adjacent.
- **Coupling:** UI clients bind directly to several API authorities, while duplicated UI components and local service abstractions reduce reuse consistency.
- **Operability:** deployment workflows exist, but invalid CI, non-blocking gates, unsigned artifacts, no proven rollback, and incomplete mobile/update paths prevent production assurance.

See `05-interface-data-inventory.md`, `13-master-finding-register.md`, and EVID-0009 through EVID-0017.
