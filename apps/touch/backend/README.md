# Touch Kiosk Backend

## Overview

The Touch Kiosk backend server provides read-only album access and order submission capabilities for customer-facing kiosk interfaces.

**Port**: 8091  
**Database**: `pb_data_touch/touch.db`  
**Mode**: Touch (read-only for albums/photos, write for orders)

## Quick Start

### Development
```bash
npm start          # Start backend server
npm run dev        # Start frontend dev server
```

Or use the BAT script:
```bash
start-touch.bat    # Starts both backend and frontend
```

## Architecture

### Server
- **Framework**: Native Node.js HTTP server
- **Database**: SQLite (better-sqlite3) with WAL mode
- **Authentication**: JWT tokens
- **Access Mode**: Read-only for albums/photos, write for orders

### Key Features
- Read-only album and photo access
- Order submission
- Sync status with Master backend
- File serving for photos
- Kiosk heartbeat tracking
- Connection status monitoring

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/mode` - Server mode (returns "touch")
- `GET /api/ip` - Network interface detection
- `POST /api/init/default-user` - Initialize default user

### Authentication
- `POST /api/auth/login` - User authentication

### Protected Endpoints
- `GET /api/collections/{collection}/records` - Read records
- `POST /api/collections/orders/records` - Submit orders (orders only)
- `GET /api/files/{collection}/{id}/{filename}` - File serving
- `GET /api/sync/status` - Sync status with Master
- `POST /api/data/refresh` - Incremental data refresh

### Recommended Additions
- `POST /api/kiosk/heartbeat` - Update kiosk heartbeat (not yet implemented)

## Collections

### Read-Only Collections
- `albums` - Photo albums (GET only)
- `photos` - Individual photos (GET only)
- `products` - Product catalog (GET only)
- `settings` - Application settings (GET only)

### Write-Enabled Collections
- `orders` - Customer orders (GET, POST)

## Security

### Authentication
- JWT tokens with 24-hour expiration
- Same security measures as Master backend
- Rate limiting enabled

### Access Restrictions
⚠️ **Note**: Read-only restrictions for albums/photos should be implemented to prevent PATCH/DELETE operations.

## Shared Utilities

Same shared utilities as Master backend:
- `auth.js` - Authentication and password hashing
- `db.js` - Database management
- `errorHandler.js` - Error handling utilities
- `logger.js` - Logging system
- `photoProcessor.js` - Photo processing
- `rateLimiter.js` - Rate limiting middleware
- `validation.js` - Request validation
- `auditLogger.js` - Audit logging

## Environment Variables

```env
# Server Configuration
PORT=8091
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-here  # REQUIRED in production

# Database
DATA_DIR=./pb_data_touch

# CORS
CORS_ORIGINS=http://localhost:5174,http://localhost:8000

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
```

## Sync with Master

The Touch backend syncs data from the Master backend:
- Albums and photos are synced from Master
- Orders are submitted to Touch database and synced to Master
- Sync status available via `/api/sync/status`

## Troubleshooting

### Server Won't Start
1. Check if port 8091 is available
2. Verify database file permissions
3. Check logs in `pb_data_touch/logs/`

### Sync Issues
1. Verify Master backend is running on port 8090
2. Check network connectivity
3. Review sync status endpoint

## Related Documentation

- [Master Backend README](../master/backend/README.md)
- [API Endpoints Complete](../master/backend/API_ENDPOINTS_COMPLETE.md)
- [Security Audit Report](../master/backend/SECURITY_AUDIT_REPORT.md)

---

**Version**: 4.1.0  
**Last Updated**: 2025-01-XX
