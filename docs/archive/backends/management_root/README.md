# Backend Server Structure

## Server Files

### Active Production Servers

#### `master/server.js`
- **Port**: 8090
- **Database**: `pb_data_master/master.db`
- **Purpose**: Master Portal backend server
- **Features**: Full CRUD operations, photo processing, admin features
- **Start Command**: `npm run dev:backend:master`

#### `touch/server.js`
- **Port**: 8091
- **Database**: `pb_data_touch/touch.db`
- **Purpose**: Touch Kiosk backend server
- **Features**: Read-only album access, order submission, sync endpoints
- **Start Command**: `npm run dev:backend:touch`

### Legacy/Development Server

#### `server.js` (Root)
- **Port**: 8090 (default, configurable)
- **Database**: `pb_data/data.db` (default)
- **Status**: Legacy server, maintained for backward compatibility
- **Purpose**: Generic development/testing server
- **Start Commands**: 
  - `npm run dev:backend` (with nodemon)
  - `npm run dev:backend:start` (without nodemon)
- **Note**: For production, use the dedicated `master/server.js` or `touch/server.js` instead.

## Shared Utilities

All backend servers use shared utilities from `shared/`:
- `auth.js` - Authentication and password hashing
- `db.js` - Database management
- `errorHandler.js` - Error handling utilities
- `logger.js` - Logging system
- `photoProcessor.js` - Photo processing and file handling
- `rateLimiter.js` - Rate limiting middleware
- `validation.js` - Request validation
- `auditLogger.js` - Audit logging
- `init-default-user.js` - Default user initialization

## Migration Notes

The project was refactored to use separate backend instances for Master and Touch portals. The root `server.js` is maintained for:
- Development and testing
- Backward compatibility
- Quick server startup without specifying master/touch

For production deployments, always use the dedicated servers:
- Master Portal → `backend/master/server.js`
- Touch Kiosk → `backend/touch/server.js`

