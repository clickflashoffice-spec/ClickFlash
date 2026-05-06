---
trigger: always_on
category: operational_laws
priority: critical
---

# Operational Laws

> **The 16 Operational Laws** are immutable rules that govern all development, deployment, and operational decisions in the Master-App and Touch-App ecosystem.

---

## Law 01: Dual-Scope Path Guard

**Explicitly confirm directory context ([Master-App] or [Touch-App]) before execution.**

### Law 11 Requirements

- Always verify which app you're working on before making changes
- Codebases are **completely separate**
- Shared logic must be **physically duplicated** (not imported/shared)

### Implementation

```
Before any code change:
1. Confirm: Am I in Master-App or Touch-App?
2. Verify: Is this the correct codebase for this feature?
3. Check: Does this logic need to be duplicated in the other app?
```

### Examples

✅ **Correct**: "Updating Master-App's photo processing in `d:\master os\New folder\Master App Python\`"  
❌ **Incorrect**: "Adding shared utility to both apps via import"

---

## Law 02: Order/Upload Mirroring

**Orders adhere to connectivity status. Touch operates 100% OFFLINE and creates orders locally AND pushes to Master via HTTP API (Primary) or Shared Path (Fallback). Touch NEVER communicates with the Cloud.**

### Data Flow

1. **Touch-App** creates customer order in its **local** folder
2. **Touch-App** pushes a copy to **Master's shared path** (via Ethernet bridge)
3. **Master-App** fetches orders exclusively from its **local path**

### Directory Structure

```
Touch-App:
  └── local/orders/          # Touch creates here first

Master-App:
  └── local/orders/          # Master reads from here
      └── from_touch/        # Orders pushed from Touch
```

### Key Points

- Touch never reads from Master's folders
- Master never writes to Touch's folders
- All communication is one-way: Touch → Master

---

## Law 03: Exclusive Face Search Delegation

**Touch performs local face indexing and search for customer photos. Master-App face recognition is limited to Photographer Login only.**

### Master-App Responsibilities

- **Photographer Login**: Authenticate staff using face recognition at station startup.
- **Worker Management**: Use WorkerPool for parallel CPU tasks but EXCLUDE photo face indexing.
- **Resource Priority**: Dedicate CPU to photo processing and cloud sync.

### Touch-App Responsibilities

- **Local Indexing**: Analyze photos locally upon import to build search descriptors.
- **Localized search**: Query face recognition on displayed photos for customer selection.
- **Total Autonomy**: Handle all customer-facing AI search without Master dependency.

### Technical Implementation

- Both apps use **dedicated, local vector databases**
- No shared database or network-based face recognition
- Offline capability for both indexing and search

---

## Law 04: Scope Integrity

**Continuously verify the execution environment ([Master-App] vs. [Touch-App]) to prevent cross-contamination.**

### Verification Checklist

- [ ] Confirm current working directory
- [ ] Verify configuration files point to correct app
- [ ] Check database connections are app-specific
- [ ] Ensure file paths are within correct app directory

### Cross-Contamination Prevention

❌ **Never**:

- Import modules from the other app
- Share database connections
- Reference the other app's file paths
- Use shared configuration files

✅ **Always**:

- Duplicate shared logic
- Maintain separate databases
- Use app-specific paths
- Keep configurations independent

---

## Law 05: Data Role Separation

**Touch-App receives only finalized or ready-for-selection photos. Master-App handles all heavy-lifting.**

### Master-App Responsibilities

- Raw photo editing
- Metadata tagging
- Asset tiering (tiny/preview/fulfillment)
- **Photographer Face Login** (Security)
- Photo processing and optimization
- Cloud synchronization relay

### Touch-App Responsibilities

- Display finalized photos
- **Customer Face Search** (Local Indexing)
- Customer selection interface
- Order creation
- Simple viewing and browsing

### Data Flow

```
Master-App:
  Raw Photos → Edit → Process → Tier → Push to Touch

Touch-App:
  Receive Finalized → Display → Customer Selects → Create Order
```

---

## Law 06: Touch Local Fetch

**Touch-App is strictly limited to fetching and displaying data only from its own dedicated local upload folder.**

### Restrictions

- Touch reads **ONLY** from `Touch-App/local/uploads/`
- Touch **NEVER** accesses Master's directories
- All photos must be pushed by Master to Touch's local folder

### Implementation

```python
# Touch-App - CORRECT
UPLOAD_FOLDER = "d:/master os/New folder/Touch App Python/local/uploads"
photos = load_from(UPLOAD_FOLDER)

# Touch-App - INCORRECT
photos = load_from("d:/master os/New folder/Master App Python/...")  # ❌
```

---

## Law 07: Master Push Logic

**Master-App is solely responsible for initiating the transfer of processed assets to designated Touch-App locations.**

### Master's Responsibilities

- Process photos to all tiers (tiny/preview/fulfillment)
- Push finalized assets to Touch's local upload folder
- Maintain sync status and transfer logs
- Handle network errors and retries

### Touch's Restrictions

- Touch **NEVER** pulls from Master
- Touch only reads what Master has pushed
- Touch has no knowledge of Master's internal structure

---

## Law 08: Touch Order Push

**Touch creates the order locally first, then pushes it to Master-App. Master-App then initiates global synchronization with the Cloud Management Hub. Touch has ZERO direct cloud access.**

### Order Creation Flow

1. Customer completes selection in Touch-App.
2. Touch creates order record in its **local offline queue**.
3. **HTTP Local Bridge**: Touch pushes record to Master Server.
4. **Master-Cloud Sync**: Master immediately pushes the order to the Cloud API for business reporting and delivery.

### Security

- Local transfers use the secure Ethernet bridge.
- Cloud transfers use encrypted HTTPS to the Management Hub.

---

## Law 09: Master Order Fetch & Cloud Relay

**Master-App monitors for incoming local orders AND acts as the exclusive relay to the Cloud Management Hub. It also pulls/pushes settings and configurations for the entire resort/site.**

### Monitoring Implementation

- Watch `local/orders/` for Kiosk hits.
- Poll/Webhook `cloud/settings` for global configuration updates.
- Process orders and sync status back to Cloud.

---

## Law 10: The Loop Rule

**All developers and processes must return to this rules list before starting any major task, code generation, or deployment phase.**

### When to Review

- ✅ Before starting new features
- ✅ Before major refactoring
- ✅ Before deployment
- ✅ When switching between Master/Touch work
- ✅ During code reviews

### Why This Matters

Ensures all work adheres to the core principles and operational laws, preventing architectural violations.

---

## Law 11: Artifact Storage

**All development artifacts MUST be stored in the `.agent` folder at the project root for cross-laptop accessibility and version control.**

### Artifact Types

- `task.md` - Current task checklist
- `implementation_plan.md` - Technical plans
- `walkthrough.md` - Completed work documentation
- `roadmap.md` - Project roadmap

### Location

```
d:\master os\New folder\.agent\
├── task.md
├── implementation_plan.md
├── walkthrough.md
├── roadmap.md
└── rules/
    └── rules.md
```

### Benefits

1. **Cross-Laptop Sync**: In project directory, not user-specific
2. **Version Control**: Can be committed to Git
3. **Persistence**: Survives across sessions
4. **Accessibility**: Easy to find and reference

---

## Law 12: Structured Storage

**All high-volume assets MUST be organized into subfolders by type to prevent directory bloat and collision.**

### Storage Structure

```
uploads/
  └── <albumId>/
      ├── highres/         # Original/Hi-Res files
      ├── thumbs/          # Generated assets (thumb, preview, tiny)
      └── ...              # Other tiers
```

### Benefits

- **Performance**: Prevents NTFS/FS slowdowns from thousands of files in one folder
- **Organization**: Clean separation of source and generated assets
- **Collision Avoidance**: Scoped by Album ID

---

## Law 13: Zero-Block IO Watermarking

**Watermark generation MUST be decoupled from the critical import path and executed in a background worker.**

### Requirement

- **Main Thread**: Handles DB writes and fast asset generation (tiny/thumb) ONLY.
- **Background Worker**: Handles heavy watermarking and large overlay operations.
- **On-Demand**: Watermark generation can be deferred until needed (e.g., download/print).

### Forbidden Patterns

❌ **Blocking Import**: `await generateWatermark()` inside the upload loop.
❌ **Main Thread Processing**: Using `sharp` for watermarking on the main event loop.

---

## Law 14: No Browser Export

**Browser-based file generation (ZIP/Blob downloads) is strictly PROHIBITED for asset export.**

### Law 14 Rationale

- **Performance**: Generating large ZIPs in the browser freezes the UI/Kiosk shell.
- **Memory**: Crashes on large albums (100GB+ requirement).
- **Architecture**: Violates the "Master Push" workflow.

❌ **Never**:

- Use `JSZip` or client-side blob downloads.
- Trigger typical "Download" browser actions for batched assets.

✅ **Always**:

- Use the **Master Push** mechanism to transfer files to Touch/Output folders.

---

## Summary

| Law | Name                       | Key Principle                           |
| --- | -------------------------- | --------------------------------------- |
| 01  | Dual-Scope Path Guard      | Always confirm Master vs Touch context  |
| 02  | Order/Upload Mirroring     | Touch creates locally, pushes to Master |
| 03  | Finalized Face Recognition | Master indexes, Touch searches          |
| 04  | Scope Integrity            | Prevent cross-contamination             |
| 05  | Data Role Separation       | Master processes, Touch displays        |
| 06  | Touch Local Fetch          | Touch reads only from its local folder  |
| 07  | Master Push Logic          | Master initiates all transfers          |
| 08  | Touch Order Push           | Touch pushes orders to Master           |
| 09  | Master Order Fetch         | Master monitors for new orders          |
| 10  | The Loop Rule              | Review rules before major work          |
| 11  | Artifact Storage           | Store artifacts in `.agent` folder      |
| 12  | Structured Storage         | Organize assets in subfolders           |
| 13  | Zero-Block IO              | Decouple heavy watermarking             |
| 14  | No Browser Export          | Prohibit browser-based ZIP/Downloads    |
| 15  | Scale Capacity             | Architecture manages 100GB+ libraries   |
| 16  | Settings Protection        | Password challenge for Kiosk admin      |

These laws are **immutable** and must be followed in all development work.
