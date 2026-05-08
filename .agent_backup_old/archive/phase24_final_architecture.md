# Phase 24: QR Frictionless Login - FINAL CORRECTED Architecture

## System Architecture (Corrected)

### Applications & Roles

1. **Master App (Local - Port 8090)**
   - Photographer's workstation (offline/local network)
   - Processes photos, creates orders
   - Prints receipt with login details + QR code
   - **Uploads photos to cloud for customer access**

2. **Touch App (Offline Kiosk - Port 8091)**
   - Guest selection station at event
   - Creates orders → sends to Master (LAN)
   - Optional: Can display QR code

3. **Management App (Online - Port 8092)**
   - CEO/Admin dashboard for business settings
   - E-commerce configuration hub
   - **Backend MAY serve customer photos via API** (database/storage)
   - Frontend is for management team ONLY

4. **Customer Gallery (Online - Public Website)**
   - PUBLIC website (gallery.clickflash.com)
   - Accessible from anywhere (home, phone, hotel)
   - Customer logs in with receipt (orderId + email) OR scans QR (roomNumber)
   - Downloads photos from cloud storage

### Customer Access Flow

```
EVENT (Photographer's Location):
1. Guest at Touch Kiosk → Selects photos
2. Touch → Creates order → Sends to Master (LAN)
3. Master → Processes photos
4. Master → Uploads photos to CLOUD STORAGE
5. Master → Prints receipt:
   - Order ID: ABC123
   - Email: guest@example.com
   - QR Code: gallery.clickflash.com?roomNumber=123

ANYWHERE (Customer at home/hotel):
6. Customer opens gallery.clickflash.com (public website)
7. Customer logs in:
   - Option A: Enter orderId + email from receipt
   - Option B: Scan QR code from receipt
8. Customer Gallery → Fetches order from CLOUD (Management backend API)
9. Customer Gallery → Loads photos from CLOUD STORAGE
10. Customer → Downloads photos
```

## Cloud Storage Question

**REQUIRES CLARIFICATION:**

Where are customer photos stored for online access?

**Option A: Management App Backend**

- Management App database/storage hosts customer photos
- Customer Gallery (frontend) connects to Management App API (backend)
- Management App FRONTEND = CEO only
- Management App BACKEND = Serves customer photo API

**Option B: Separate Cloud Storage**

- Master uploads to AWS S3, Google Cloud Storage, etc.
- Customer Gallery fetches directly from cloud storage
- Management App completely separate (CEO only)

**Option C: Photos stay on Master App**

- Master App exposed via dynamic DNS/VPN
- Customer Gallery connects to Master App public API
- Requires port forwarding/cloud tunnel

## Implementation Status

### ✅ AI Culling Dashboard (Master App)

- File: `master-app/react-new/src/components/culling/AICullingDashboard.tsx`
- Enhanced with statistics panel
- Glassmorphic UI completed

### ⚠️ QR Login Flow (Needs Cloud Storage Decision)

**Current Implementation:**

- Customer Gallery has `roomNumber` query parameter support
- Customer Gallery has `getOrderByRoomNumber()` API call
- BUT: Currently points to localhost (won't work from customer's home)

**Required Fix:**

```typescript
// File: web/customer-gallery/src/services/cloudApiService.ts

// CURRENT (wrong - localhost)
const baseUrl = 'http://127.0.0.1:8093';

// NEEDED (cloud URL)
const baseUrl = process.env.REACT_APP_API_URL || 'https://api.clickflash.com';
// OR
const baseUrl = process.env.REACT_APP_API_URL || 'https://management.clickflash.com/api';
```

### Required Components

1. **Master App: Receipt Printer with QR**
   - Generate QR code: `https://gallery.clickflash.com?roomNumber=${roomNumber}`
   - Print on thermal receipt

2. **Customer Gallery: Environment Configuration**
   - `.env`: `REACT_APP_API_URL=https://api.clickflash.com`
   - Must point to publicly accessible API

3. **Backend API: Customer Photo Endpoint**
   - `GET /api/orders/by-room?roomNumber=123`
   - `GET /api/photos/by-order/:orderId`
   - Must be publicly accessible (with authentication)

## QR Code Content

**Simple Format (Recommended):**

```
https://gallery.clickflash.com?roomNumber=123
```

**Alternative with Order ID:**

```
https://gallery.clickflash.com?orderId=ABC123&email=guest@example.com
```

## Security Considerations

Since Customer Gallery is public:

- Backend must validate order credentials
- Rate limiting on login attempts
- Photo URLs should be signed/temporary
- HTTPS required for all connections

## Next Steps

1. **Clarify Cloud Storage Architecture**
   - Where are customer photos hosted?
   - What is the production API URL?

2. **Update Customer Gallery API Service**
   - Change localhost URLs to production cloud URLs
   - Add environment variable configuration

3. **Implement Master App Receipt Printing**
   - Add QR code generation
   - Include login credentials on receipt

4. **Deploy Customer Gallery**
   - Host at gallery.clickflash.com (or similar)
   - Configure production API endpoints

## Verify: Architecture Confirmed?

**Key Question:** Where are customer photos stored for global access? (Management App backend? Separate cloud storage? Master App with public access?)
