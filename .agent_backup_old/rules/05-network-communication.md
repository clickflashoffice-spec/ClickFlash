---
category: network
priority: critical
---

# Network Communication

> **Core Principle**: The system operates **100% offline** with communication only via direct Ethernet or Local WiFi (LAN). All transfer paths are pre-configured and operational.

---

## Port Assignments (Immutable)

### Master-App

**Port**: `8090`

```python
# Master App Python/backend/config.py
MASTER_PORT = 8090

# Start server
uvicorn.run(app, host="0.0.0.0", port=8090)
```

### Touch-App

**Port**: `8091`

```python
# Touch App Python/backend/config.py
TOUCH_PORT = 8091

# Start server
uvicorn.run(app, host="0.0.0.0", port=8091)
```

> [!CAUTION]
> **These ports are IMMUTABLE**. Do not change them without updating all configuration files, documentation, and deployment scripts.

---

## Offline Operation Requirements

### Core Operations (Must Work Offline)

✅ **Fully Offline**:

- Photo import and editing
- Asset tiering and processing
- Face recognition indexing and search
- Order creation and processing
- Album management
- Customer selection interface
- All database operations
- File transfers between Master and Touch

❌ **Not Required Offline** (Separate Systems):

- Customer Gallery App (online platform)
- Management App (online control)
- Software updates
- External backups

### Network Isolation

```python
# Verify no internet dependency
def check_offline_capability():
    """Ensure core operations work without internet"""
    
    # Disable network adapter (for testing)
    disable_network()
    
    try:
        # Test core operations
        assert can_import_photos()
        assert can_process_photos()
        assert can_create_orders()
        assert can_search_faces()
        
        print("✓ All core operations work offline")
    finally:
        enable_network()
```

---

## LAN Communication Protocols

### Ethernet Bridge

**Primary Method**: Direct Ethernet cable between Master and Touch

```
┌──────────────┐         Ethernet Cable        ┌──────────────┐
│  Master-App  │◄──────────────────────────────►│  Touch-App   │
│  (8090)      │                                │  (8091)      │
└──────────────┘                                └──────────────┘
```

**Configuration**:

```bash
# Master-App
IP: 192.168.1.10
Port: 8090
Subnet: 255.255.255.0

# Touch-App
IP: 192.168.1.11
Port: 8091
Subnet: 255.255.255.0
```

### Local WiFi (LAN)

**Alternative Method**: Same local network via WiFi

```
                    ┌──────────────┐
                    │   Router     │
                    │  (LAN Only)  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐           ┌─────▼───────┐
       │  Master-App │           │  Touch-App  │
       │  (8090)     │           │  (8091)     │
       └─────────────┘           └─────────────┘
```

**Requirements**:

- Router must NOT have internet connection
- Network must be isolated from external networks
- Static IP addresses for both apps

---

## File Transfer Protocols

### SMB/CIFS (Windows File Sharing)

**Setup**:

```powershell
# On Master-App machine
# Share the orders folder
New-SmbShare -Name "MasterOrders" -Path "d:\master os\New folder\Master App Python\local\orders"

# On Touch-App machine
# Mount the share
net use Z: \\MASTER-PC\MasterOrders
```

**Usage**:

```python
# Touch-App pushes order
import shutil

source = "d:/master os/New folder/Touch App Python/local/orders/order.json"
destination = "Z:/from_touch/order.json"

shutil.copy2(source, destination)
```

### Direct File Copy (Mapped Network Drive)

```python
# Configuration
MASTER_ORDERS_PATH = "\\\\192.168.1.10\\MasterOrders\\from_touch\\"
TOUCH_UPLOADS_PATH = "\\\\192.168.1.11\\TouchUploads\\"

def push_order_to_master(order_file):
    """Push order from Touch to Master"""
    destination = os.path.join(MASTER_ORDERS_PATH, os.path.basename(order_file))
    shutil.copy2(order_file, destination)
    
def push_photos_to_touch(photo_files):
    """Push photos from Master to Touch"""
    for photo in photo_files:
        destination = os.path.join(TOUCH_UPLOADS_PATH, os.path.basename(photo))
        shutil.copy2(photo, destination)
```

---

## Network Security

### Firewall Rules

**Master-App**:

```powershell
# Allow inbound on port 8090 (LAN only)
New-NetFirewallRule -DisplayName "Master-App" `
    -Direction Inbound `
    -LocalPort 8090 `
    -Protocol TCP `
    -Action Allow `
    -RemoteAddress LocalSubnet
```

**Touch-App**:

```powershell
# Allow inbound on port 8091 (LAN only)
New-NetFirewallRule -DisplayName "Touch-App" `
    -Direction Inbound `
    -LocalPort 8091 `
    -Protocol TCP `
    -Action Allow `
    -RemoteAddress LocalSubnet
```

### Access Control

```python
# Only accept connections from LAN
ALLOWED_NETWORKS = [
    "192.168.1.0/24",  # Local network
    "127.0.0.1"        # Localhost
]

def is_allowed_ip(ip_address):
    """Check if IP is from allowed network"""
    import ipaddress
    
    ip = ipaddress.ip_address(ip_address)
    
    for network in ALLOWED_NETWORKS:
        if ip in ipaddress.ip_network(network):
            return True
    
    return False

# Middleware to block external IPs
@app.middleware("http")
async def validate_ip(request: Request, call_next):
    client_ip = request.client.host
    
    if not is_allowed_ip(client_ip):
        return JSONResponse(
            status_code=403,
            content={"error": "Access denied"}
        )
    
    return await call_next(request)
```

---

## Service Discovery (Optional)

### Zeroconf/mDNS

For automatic discovery on LAN:

```python
from zeroconf import ServiceInfo, Zeroconf
import socket

def register_master_service():
    """Register Master-App on the network"""
    zeroconf = Zeroconf()
    
    info = ServiceInfo(
        "_master-app._tcp.local.",
        "Master-App._master-app._tcp.local.",
        addresses=[socket.inet_aton("192.168.1.10")],
        port=8090,
        properties={"version": "1.0", "app": "Master-App"}
    )
    
    zeroconf.register_service(info)
    return zeroconf

def discover_master_service():
    """Discover Master-App from Touch-App"""
    from zeroconf import ServiceBrowser, Zeroconf
    
    class MasterListener:
        def add_service(self, zeroconf, type, name):
            info = zeroconf.get_service_info(type, name)
            if info:
                print(f"Found Master-App at {info.addresses[0]}:{info.port}")
    
    zeroconf = Zeroconf()
    browser = ServiceBrowser(zeroconf, "_master-app._tcp.local.", MasterListener())
```

---

## Connection Testing

### Network Connectivity Check

```python
import socket

def test_master_connection():
    """Test connection to Master-App from Touch-App"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(("192.168.1.10", 8090))
        sock.close()
        
        if result == 0:
            print("✓ Master-App is reachable")
            return True
        else:
            print("✗ Master-App is not reachable")
            return False
    except Exception as e:
        print(f"✗ Connection test failed: {e}")
        return False

def test_touch_connection():
    """Test connection to Touch-App from Master-App"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(("192.168.1.11", 8091))
        sock.close()
        
        if result == 0:
            print("✓ Touch-App is reachable")
            return True
        else:
            print("✗ Touch-App is not reachable")
            return False
    except Exception as e:
        print(f"✗ Connection test failed: {e}")
        return False
```

### File Transfer Test

```python
def test_file_transfer():
    """Test file transfer between apps"""
    import tempfile
    
    # Create test file
    test_file = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    test_file.write(b"Test data")
    test_file.close()
    
    try:
        # Test Touch → Master
        push_order_to_master(test_file.name)
        print("✓ Touch → Master transfer successful")
        
        # Test Master → Touch
        push_photos_to_touch([test_file.name])
        print("✓ Master → Touch transfer successful")
        
        return True
    except Exception as e:
        print(f"✗ File transfer failed: {e}")
        return False
    finally:
        os.unlink(test_file.name)
```

---

## Troubleshooting

### Common Issues

**Issue**: Cannot connect between Master and Touch

**Solutions**:

1. Check both apps are on same network
2. Verify firewall rules allow traffic
3. Confirm correct IP addresses and ports
4. Test with `ping` command
5. Check network cables (if using Ethernet)

**Issue**: File transfers fail

**Solutions**:

1. Verify network shares are accessible
2. Check file permissions
3. Ensure sufficient disk space
4. Test with small file first
5. Check network stability

**Issue**: Slow file transfers

**Solutions**:

1. Use Gigabit Ethernet (1000 Mbps)
2. Check for network congestion
3. Optimize file sizes (use asset tiering)
4. Transfer in batches, not all at once

---

## Summary

| Aspect | Configuration |
|--------|---------------|
| **Master Port** | 8090 (immutable) |
| **Touch Port** | 8091 (immutable) |
| **Connection** | Ethernet or LAN WiFi |
| **Internet** | Not required for core operations |
| **File Transfer** | SMB/CIFS or mapped drives |
| **Security** | Firewall rules, IP whitelisting |
| **Discovery** | Optional Zeroconf/mDNS |

**Key Principle**: All network communication happens **locally** without internet dependency.
