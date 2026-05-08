---
trigger: always_on
category: core
priority: critical
---

# Core System Principles

## Foundation Philosophy

The system foundation is built on **three immutable pillars**:

### 1. Absolute Separation

- **Master-App** and **Touch-App** are completely independent codebases
- Shared logic must be **physically duplicated** across both apps
- No shared dependencies or coupled modules
- Each app has its own database, storage, and processing pipeline

### 2. Local Processing Power

- All heavy computation happens **locally on the machine**
- No cloud dependencies for core operations
- Raw photo editing, metadata tagging, and asset tiering done locally
- Face recognition indexing and search performed on local hardware

### 3. Tiered Connectivity Model

- **Touch-App (100% Offline Only)**: Strict local operation. Never connects to the cloud. All data stays on the local network.
- **Master-App (Offline-First / Cloud Bridge)**: Functions fully offline for local operations, but acts as the **exclusive gateway** for cloud synchronization.
- **Cloud-Apps (100% Online Only)**: Management Hub and Customer Gallery reside entirely on Cloudflare Workers/D1/R2 and are the targets for Master-App sync.

---

## Scale Requirements

> [!IMPORTANT]
> **Rule 15 (Scale Capacity)**: Architecture must manage high-resolution photographs **exceeding 100GB**.

### Performance Targets

- **Asset Volume**: Hundreds of gigabytes (GBs) of high-resolution assets
- **Concurrent Operations**: Support multiple simultaneous photo processing tasks
- **Response Time**: Fast loading even with 100GB+ libraries
- **Memory Efficiency**: Optimized for large-scale asset management

### Technical Implications

- Efficient database indexing required
- Asset tiering for performance (tiny/preview/fulfillment)
- **Structured Storage**: Subfolders by Album ID to prevent FS limits
- Lazy loading and pagination strategies
- Background processing for heavy operations

---

## Internet Resilience Protocol

> [!IMPORTANT]
> The core ecosystem is **Offline-Resilient**, meaning it continues to function during outages, but it is **Cloud-Optimized** for management and delivery.

✅ **Allowed**:

- **Cloud Management Hub Sync**: Bi-directional sync for Master-App ONLY.
- **Customer Gallery Uploads**: Pushing assets to web storage from Master-App ONLY.
- **Strict LAN Only**: Touch-App core operations must be 100% offline, communicating only via local Ethernet to Master-App.
- Localhost communication (127.0.0.1)

❌ **Prohibited**:

- Cloud-dependent *core* processing (Detection/Editing must remain local)
- Internet-dependent *kiosk* startup (Kiosks must boot without internet)
- **Browser-based file exports (ZIP/Download)** (All exports must use Master -> Touch push)

### Dedicated Online Systems

The following are **cloud-native systems** external to the local offline core:

- **Customer Gallery App**: Online portal for customer photo access (Cloudflare Worker).
- **Management App**: Centralized online hub for business management (Cloudflare Worker).

---

## Kiosk Mode (Mandatory)

Both Master-App and Touch-App must operate as a **shell environment** for secure, dedicated usage.

### Platform Requirements

| Platform | Kiosk Implementation |
|----------|---------------------|
| **Web Version** | Full-screen, focused view enforced |
| **Electron Version** | OS-level Kiosk/Assigned Access mode |
| **NSIS Version** | Installer configures Assigned Access |
| **Python Version** | Equivalent kiosk/fullscreen mode |

### Security Goals

- Prevent users from accessing other applications
- Lock down to photography workflow only
- Disable system shortcuts and task switching
- Dedicated, focused user experience

---

## The Loop Rule

> [!IMPORTANT]
> **Operational Law 10**: All developers and processes must return to this rules list before starting any major task, code generation, or deployment phase.

### When to Review Rules

- ✅ Before starting a new feature
- ✅ Before major refactoring
- ✅ Before deployment or release
- ✅ When switching between Master and Touch work
- ✅ When encountering architectural decisions

### Why This Matters

- Ensures consistency across the codebase
- Prevents violations of core principles
- Maintains separation between Master and Touch
- Reinforces offline-first architecture

---

## Summary

These core principles form the **foundation** of the entire system:

1. **Separation**: Master and Touch are independent
2. **Local**: All processing happens on-device
3. **Offline**: No internet required for core operations
4. **Scale**: Handle 100GB+ photo libraries
5. **Kiosk**: Dedicated, locked-down environment
6. **Loop**: Always review rules before major work

All other rules, operational laws, and technical decisions flow from these principles.
