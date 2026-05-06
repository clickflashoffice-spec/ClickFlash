---
category: architecture
priority: critical
---

# Architecture Separation

> **Core Principle**: Master-App and Touch-App are **completely independent** codebases. They share **no development files**. Shared logic must be physically duplicated. Communication is handled exclusively at the network/file system level.

---

## Master-App vs Touch-App Responsibilities

### Master-App: The Processing Powerhouse

**Primary Role**: Heavy-duty photo processing and backend operations

**Responsibilities**:

- ✅ Raw photo import and editing
- ✅ Metadata tagging and organization
- ✅ Asset tiering (tiny/preview/fulfillment generation)
- ✅ Face recognition indexing (global backend)
- ✅ Photo processing and optimization
- ✅ Album management and organization
- ✅ Order fulfillment and packaging
- ✅ Pushing finalized assets to Touch-App

**Port**: 8090

**Database**: `master_app.db` (SQLite, local)

**Storage**: `Master App Python/local/`

---

### Touch-App: The Customer Interface

**Primary Role**: Customer-facing photo selection and ordering

**Responsibilities**:

- ✅ Display finalized photos
- ✅ Customer selection interface
- ✅ Order creation
- ✅ Face recognition search (localized client)
- ✅ Simple browsing and viewing
- ✅ Pushing orders to Master-App

**Port**: 8091

**Database**: `touch_app.db` (SQLite, local)

**Storage**: `Touch App Python/local/`

---

## Codebase Separation Requirements

### Physical Separation

```
d:\master os\New folder\
├── Master App Python/          # Completely independent
│   ├── backend/
│   ├── frontend/
│   ├── local/
│   └── .venv_master_311/
│
└── Touch App Python/           # Completely independent
    ├── backend/
    ├── frontend/
    ├── local/
    └── .venv_touch_311/
```

### No Shared Code

❌ **Prohibited**:

```python
# WRONG - Importing from other app
from master_app.utils import photo_processor  # ❌
from touch_app.helpers import validator       # ❌
```

✅ **Required**:

```python
# CORRECT - Duplicate the code in each app
# Master App Python/backend/utils/photo_processor.py
# Touch App Python/backend/utils/photo_processor.py
# (Same code, physically duplicated)
```

---

## Shared Logic Duplication Rules

### When to Duplicate

Duplicate code when it's used by both apps:

- Utility functions (file handling, validation, etc.)
- Data models (if similar structures needed)
- Configuration helpers
- Common algorithms

### How to Duplicate

1. **Copy the entire file** to the other app
2. **Maintain separately** - changes in one don't auto-update the other
3. **Document duplication** - add comment noting it's duplicated
4. **Manual sync** - if logic changes, manually update both

### Example

```python
# Master App Python/backend/utils/validators.py
"""
Validation utilities for Master-App
NOTE: This file is duplicated in Touch-App
"""

def validate_photo_path(path: str) -> bool:
    # Validation logic
    pass
```

```python
# Touch App Python/backend/utils/validators.py
"""
Validation utilities for Touch-App
NOTE: This file is duplicated in Master-App
"""

def validate_photo_path(path: str) -> bool:
    # Same validation logic
    pass
```

---

## Scope Integrity Verification

### Pre-Execution Checklist

Before making any code changes:

- [ ] **Confirm directory**: Am I in Master-App or Touch-App?
- [ ] **Verify purpose**: Is this the correct app for this feature?
- [ ] **Check dependencies**: Are all imports from within this app?
- [ ] **Validate paths**: Do all file paths point to this app's directories?
- [ ] **Review database**: Am I using the correct app's database?

### Runtime Verification

```python
# Add to both apps' startup
import os

APP_NAME = "Master-App"  # or "Touch-App"
APP_ROOT = os.path.dirname(os.path.abspath(__file__))

assert "Master App Python" in APP_ROOT or "Touch App Python" in APP_ROOT, \
    f"Invalid app root: {APP_ROOT}"

print(f"✓ Running {APP_NAME} from {APP_ROOT}")
```

---

## Communication Between Apps

### Allowed Communication

✅ **File-based communication only**:

- Touch pushes orders to Master's local folder
- Master pushes photos to Touch's local folder
- Via Ethernet bridge or shared network folder

❌ **Prohibited**:

- Direct API calls between apps
- Shared database connections
- Shared memory or IPC
- Module imports across apps

### Data Exchange Pattern

```
Touch-App                          Master-App
    |                                  |
    | 1. Create order.json             |
    |--------------------------------->|
    |    (Copy to Master's folder)     |
    |                                  |
    |                                  | 2. Process order
    |                                  |
    |                                  | 3. Generate assets
    |                                  |
    | 4. Push photos                   |
    |<---------------------------------|
    |    (Copy to Touch's folder)      |
    |                                  |
```

---

## Database Independence

### Separate Databases

```
Master App Python/local/
└── master_app.db              # Master's database

Touch App Python/local/
└── touch_app.db               # Touch's database
```

### No Shared Tables

Each app maintains its own:

- Albums
- Photos
- Orders
- Settings
- Users
- Face recognition data

### Data Synchronization

When data needs to be shared:

1. Export from source app to JSON
2. Copy JSON file to target app's folder
3. Import JSON into target app's database

---

## Configuration Independence

### Separate Configuration Files

```python
# Master App Python/backend/config.py
class MasterConfig:
    PORT = 8090
    DATABASE = "local/master_app.db"
    UPLOAD_FOLDER = "local/uploads"
    
# Touch App Python/backend/config.py
class TouchConfig:
    PORT = 8091
    DATABASE = "local/touch_app.db"
    UPLOAD_FOLDER = "local/uploads"
```

### Environment Variables

```bash
# Master-App .env
APP_NAME=Master-App
APP_PORT=8090
DATABASE_PATH=local/master_app.db

# Touch-App .env
APP_NAME=Touch-App
APP_PORT=8091
DATABASE_PATH=local/touch_app.db
```

---

## Testing Separation

### Independent Test Suites

```
Master App Python/
└── tests/
    ├── test_photo_processing.py
    ├── test_face_recognition.py
    └── test_order_fulfillment.py

Touch App Python/
└── tests/
    ├── test_customer_selection.py
    ├── test_order_creation.py
    └── test_photo_display.py
```

### No Cross-App Testing

- Master tests don't import Touch code
- Touch tests don't import Master code
- Integration tests use file-based communication

---

## Summary

| Aspect | Master-App | Touch-App | Shared? |
|--------|-----------|-----------|---------|
| **Codebase** | Independent | Independent | ❌ No |
| **Database** | master_app.db | touch_app.db | ❌ No |
| **Port** | 8090 | 8091 | ❌ No |
| **Storage** | Master/local/ | Touch/local/ | ❌ No |
| **Virtual Env** | .venv_master_311 | .venv_touch_311 | ❌ No |
| **Communication** | File-based | File-based | ✅ Yes |

**Key Takeaway**: Treat Master-App and Touch-App as if they were developed by different teams for different companies. The only connection is file-based data exchange.
