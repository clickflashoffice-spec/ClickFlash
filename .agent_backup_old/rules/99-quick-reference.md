---
category: reference
priority: high
---

# Quick Reference

> **Cheat Sheet**: Quick lookup for common rules, commands, and configurations.

---

## Port Numbers

| Application | Port | Protocol |
|-------------|------|----------|
| **Master-App** | `8090` | HTTP |
| **Touch-App** | `8091` | HTTP |

**IMMUTABLE**: Do not change these ports.

---

## Key Operational Laws

### Most Critical

| Law | Name | Quick Summary |
|-----|------|---------------|
| **01** | Dual-Scope Path Guard | Always confirm Master vs Touch context |
| **04** | Scope Integrity | Prevent cross-contamination |
| **10** | The Loop Rule | Review rules before major work |
| **11** | Artifact Storage | Store artifacts in `.agent` folder |

### Data Flow

| Law | Name | Quick Summary |
|-----|------|---------------|
| **02** | Order/Upload Mirroring | Touch creates locally, pushes to Master |
| **06** | Touch Local Fetch | Touch reads only from its local folder |
| **07** | Master Push Logic | Master initiates all transfers |
| **08** | Touch Order Push | Touch pushes orders to Master |
| **09** | Master Order Fetch | Master monitors for new orders |

---

## Asset Tiers

| Tier | Size | Format | Purpose | Stored Where |
|------|------|--------|---------|--------------|
| **Tiny** | 100px | WebP | Grid thumbnails | Master + Touch |
| **Preview** | 1200px | JPEG | Customer selection | Master + Touch |
| **Fulfillment** | Original | Original | Final delivery | Master only |

---

## Directory Structure

### Master-App

```
Master App Python/
├── backend/               # FastAPI backend
├── frontend/              # Web frontend
├── local/
│   ├── raw/              # Raw imported photos
│   ├── assets/
│   │   ├── tiny/         # 100px WebP
│   │   ├── preview/      # 1200px JPEG
│   │   └── fulfillment/  # Original high-res
│   ├── orders/
│   │   ├── from_touch/   # Orders from Touch
│   │   └── processed/    # Archived orders
│   └── face_recognition/
└── .venv_master_311/     # Virtual environment
```

### Touch-App

```
Touch App Python/
├── backend/               # FastAPI backend
├── frontend/              # Web frontend
├── local/
│   ├── uploads/
│   │   ├── tiny/         # From Master
│   │   └── preview/      # From Master
│   ├── orders/
│   │   ├── pending/      # Created locally
│   │   └── sent/         # Sent to Master
│   └── face_recognition/
└── .venv_touch_311/      # Virtual environment
```

---

## Common Commands

### Start Applications

```bash
# Master-App
cd "d:\master os\New folder\Master App Python"
.venv_master_311\Scripts\activate
python main.py

# Touch-App
cd "d:\master os\New folder\Touch App Python"
.venv_touch_311\Scripts\activate
python main.py
```

### Install Dependencies

```bash
# Master-App
cd "Master App Python"
python -m venv .venv_master_311
.venv_master_311\Scripts\activate
pip install -r backend\requirements.txt

# Touch-App
cd "Touch App Python"
python -m venv .venv_touch_311
.venv_touch_311\Scripts\activate
pip install -r backend\requirements.txt
```

### Run Tests

```bash
# Master-App
cd "Master App Python"
pytest tests/

# Touch-App
cd "Touch App Python"
pytest tests/
```

### Build Executables

```bash
# Master-App
cd "Master App Python"
pyinstaller main.spec

# Touch-App
cd "Touch App Python"
pyinstaller main.spec
```

---

## Configuration Files

### Master-App Config

```python
# Master App Python/backend/config.py
class MasterConfig:
    APP_NAME = "Master-App"
    PORT = 8090
    DATABASE = "local/master_app.db"
    UPLOAD_FOLDER = "local/uploads"
    ASSETS_FOLDER = "local/assets"
```

### Touch-App Config

```python
# Touch App Python/backend/config.py
class TouchConfig:
    APP_NAME = "Touch-App"
    PORT = 8091
    DATABASE = "local/touch_app.db"
    UPLOAD_FOLDER = "local/uploads"
```

---

## API Endpoints

### Master-App

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/photos/import` | Import raw photos |
| `POST` | `/api/photos/process/{id}` | Process photo (all tiers) |
| `POST` | `/api/faces/index/{id}` | Index faces in photo |
| `GET` | `/api/albums` | List all albums |
| `POST` | `/api/albums` | Create new album |

### Touch-App

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/photos` | List available photos |
| `GET` | `/api/photos/{id}` | Get photo details |
| `POST` | `/api/orders` | Create customer order |
| `GET` | `/api/faces/search/{id}` | Search similar faces |

---

## Database Tables

### Master-App

```sql
-- Albums
CREATE TABLE albums (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos
CREATE TABLE photos (
    id INTEGER PRIMARY KEY,
    album_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    tiny_path TEXT,
    preview_path TEXT,
    fulfillment_path TEXT,
    FOREIGN KEY (album_id) REFERENCES albums(id)
);

-- Face Encodings
CREATE TABLE face_encodings (
    id INTEGER PRIMARY KEY,
    photo_id INTEGER NOT NULL,
    encoding TEXT NOT NULL,
    location TEXT NOT NULL,
    FOREIGN KEY (photo_id) REFERENCES photos(id)
);
```

### Touch-App

```sql
-- Orders
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    selected_photos TEXT NOT NULL,  -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
);
```

---

## Network Configuration

### Static IP Setup

```bash
# Master-App Machine
IP: 192.168.1.10
Subnet: 255.255.255.0
Gateway: 192.168.1.1

# Touch-App Machine
IP: 192.168.1.11
Subnet: 255.255.255.0
Gateway: 192.168.1.1
```

### Firewall Rules

```powershell
# Master-App
New-NetFirewallRule -DisplayName "Master-App" `
    -Direction Inbound `
    -LocalPort 8090 `
    -Protocol TCP `
    -Action Allow

# Touch-App
New-NetFirewallRule -DisplayName "Touch-App" `
    -Direction Inbound `
    -LocalPort 8091 `
    -Protocol TCP `
    -Action Allow
```

---

## Troubleshooting

### Quick Diagnostics

```bash
# Check if app is running
netstat -ano | findstr :8090  # Master
netstat -ano | findstr :8091  # Touch

# Test network connectivity
ping 192.168.1.10  # Master
ping 192.168.1.11  # Touch

# Check database
sqlite3 local/master_app.db "SELECT COUNT(*) FROM photos;"

# View logs
tail -f app.log
```

### Common Fixes

| Issue | Solution |
|-------|----------|
| Port already in use | Kill process: `taskkill /PID <pid> /F` |
| Database locked | Close all app instances |
| Import errors | Verify correct virtual environment activated |
| Network unreachable | Check firewall rules and IP configuration |

---

## File Paths

### Artifacts

```
d:\master os\New folder\.agent\
├── task.md
├── implementation_plan.md
├── walkthrough.md
└── roadmap.md
```

### Rules Documentation

```
d:\master os\New folder\docs\rules\
├── README.md
├── 01-core-principles.md
├── 02-operational-laws.md
├── 03-architecture-separation.md
├── 04-data-flow.md
├── 05-network-communication.md
├── 06-asset-management.md
├── 07-platform-requirements.md
├── 08-face-recognition.md
├── 09-kiosk-mode.md
├── 10-development-workflow.md
└── 99-quick-reference.md
```

---

## Version Information

| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.11+ | Required for both apps |
| FastAPI | 0.110.0+ | Web framework |
| SQLAlchemy | 2.0.0+ | Database ORM |
| PyQt6 | 6.6.0+ | GUI framework |
| Pillow | 10.2.0+ | Image processing |
| face_recognition | 1.3.0+ | Face recognition |

---

## Emergency Contacts

### System Restart

```bash
# Restart Master-App
taskkill /F /IM MasterApp.exe
cd "Master App Python"
python main.py

# Restart Touch-App
taskkill /F /IM TouchApp.exe
cd "Touch App Python"
python main.py
```

### Database Backup

```bash
# Backup Master database
copy "Master App Python\local\master_app.db" "backup\master_app_backup.db"

# Backup Touch database
copy "Touch App Python\local\touch_app.db" "backup\touch_app_backup.db"
```

---

## Summary

**Essential Information**:

- **Ports**: Master (8090), Touch (8091)
- **Tiers**: Tiny (100px WebP), Preview (1200px JPEG), Fulfillment (Original)
- **Laws**: Review before major work (Law 10)
- **Storage**: Artifacts in `.agent` folder (Law 11)

**Quick Start**:

1. Activate virtual environment
2. Start backend: `python main.py`
3. Access at `http://localhost:8090` (Master) or `http://localhost:8091` (Touch)

For detailed information, see the full rules documentation in `docs/rules/`.
